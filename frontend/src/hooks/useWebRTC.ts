'use client';
import { useEffect, useRef, useCallback, useState } from 'react';
import { Socket } from 'socket.io-client';

interface UseWebRTCOptions {
  roomId: string;
  role: 'caller' | 'callee';
  signalingSocket: Socket;
  onRemoteStream?: (stream: MediaStream) => void;
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
}

export function useWebRTC({
  roomId,
  role,
  signalingSocket,
  onRemoteStream,
  onConnectionStateChange,
}: UseWebRTCOptions) {
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  // Buffer offer received before getUserMedia completes (callee timing race)
  const pendingOffer = useRef<RTCSessionDescriptionInit | null>(null);
  // Buffer ICE candidates received before setRemoteDescription
  const pendingCandidates = useRef<RTCIceCandidateInit[]>([]);
  // Guard against adding local tracks twice
  const tracksAdded = useRef(false);
  // Buffer stream when startCall fires before ice_config arrives
  const pendingStream = useRef<MediaStream | null>(null);
  // Always-current ref to startCall so handleIceConfig can invoke it without stale closure
  const startCallRef = useRef<((s: MediaStream) => Promise<void>) | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>('new');

  // NOTE: onRemoteStream and onConnectionStateChange MUST be stable references
  // (wrapped in useCallback at the call site) — otherwise createPeerConnection
  // changes on every render, the signaling effect re-runs every second (due to
  // the timer), and the peerConnection is destroyed before WebRTC can negotiate.
  const createPeerConnection = useCallback((iceServers: RTCIceServer[]) => {
    const pc = new RTCPeerConnection({ iceServers, iceCandidatePoolSize: 10 });

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) signalingSocket.emit('ice_candidate', { candidate, roomId });
    };

    pc.ontrack = ({ streams }) => {
      if (streams[0]) onRemoteStream?.(streams[0]);
    };

    pc.onconnectionstatechange = () => {
      setConnectionState(pc.connectionState);
      setIsConnected(pc.connectionState === 'connected');
      onConnectionStateChange?.(pc.connectionState);
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'failed') pc.restartIce();
    };

    return pc;
  }, [roomId, signalingSocket, onRemoteStream, onConnectionStateChange]);

  // Guard prevents duplicate tracks when both startCall and handleOffer race
  const addLocalStreamToPeer = useCallback((stream: MediaStream) => {
    if (tracksAdded.current) return;
    const pc = peerConnection.current;
    if (!pc) return;
    stream.getTracks().forEach(track => pc.addTrack(track, stream));
    tracksAdded.current = true;
  }, []);

  // Flush ICE candidates that arrived before setRemoteDescription
  const drainPendingCandidates = useCallback(async () => {
    const pc = peerConnection.current;
    if (!pc || !pc.remoteDescription || pendingCandidates.current.length === 0) return;
    const candidates = pendingCandidates.current.splice(0);
    for (const c of candidates) {
      try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch {}
    }
  }, []);

  const getUserMedia = useCallback(async (video: boolean, audio: boolean) => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: video ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } : false,
      audio: audio ? { echoCancellation: true, noiseSuppression: true, sampleRate: 44100 } : false,
    });
    localStream.current = stream;
    return stream;
  }, []);

  const startCall = useCallback(async (stream: MediaStream) => {
    const pc = peerConnection.current;
    if (!pc) {
      // ice_config hasn't arrived yet — buffer the stream.
      // handleIceConfig will call startCall again once the peerConnection is ready.
      pendingStream.current = stream;
      return;
    }
    pendingStream.current = null;

    addLocalStreamToPeer(stream);

    if (role === 'caller') {
      const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
      await pc.setLocalDescription(offer);
      signalingSocket.emit('offer', { offer, roomId });
    } else if (pendingOffer.current) {
      // Callee: the offer arrived before getUserMedia completed — process it now
      // that local tracks have just been added above.
      const bufferedOffer = pendingOffer.current;
      pendingOffer.current = null;
      await pc.setRemoteDescription(new RTCSessionDescription(bufferedOffer));
      await drainPendingCandidates();
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      signalingSocket.emit('answer', { answer, roomId });
    }
  }, [role, roomId, signalingSocket, addLocalStreamToPeer, drainPendingCandidates]);

  // Keep ref in sync on every render so handleIceConfig never has a stale closure
  startCallRef.current = startCall;

  const toggleVideo = useCallback((enabled: boolean) => {
    localStream.current?.getVideoTracks().forEach(track => { track.enabled = enabled; });
  }, []);

  const toggleAudio = useCallback((enabled: boolean) => {
    localStream.current?.getAudioTracks().forEach(track => { track.enabled = enabled; });
  }, []);

  const stopMedia = useCallback(() => {
    localStream.current?.getTracks().forEach(track => track.stop());
    localStream.current = null;
    peerConnection.current?.close();
    peerConnection.current = null;
    pendingOffer.current = null;
    pendingCandidates.current = [];
    pendingStream.current = null;
    tracksAdded.current = false;
    setIsConnected(false);
  }, []);

  useEffect(() => {
    if (!signalingSocket) return;

    const handleIceConfig = ({ iceServers }: { iceServers: RTCIceServer[] }) => {
      peerConnection.current = createPeerConnection(iceServers);
      tracksAdded.current = false;
      // startCall may have fired before ice_config arrived — flush the buffered stream now.
      if (pendingStream.current) {
        const s = pendingStream.current;
        pendingStream.current = null;
        startCallRef.current?.(s);
      }
    };

    const handleOffer = async ({ offer }: { offer: RTCSessionDescriptionInit }) => {
      if (role !== 'callee') return;
      const pc = peerConnection.current;
      // Buffer: process only after peerConnection exists AND local stream is ready.
      // startCall() will flush the buffered offer once getUserMedia completes.
      if (!pc || !localStream.current) {
        pendingOffer.current = offer;
        return;
      }
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      addLocalStreamToPeer(localStream.current); // no-op if startCall already added tracks
      await drainPendingCandidates();
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      signalingSocket.emit('answer', { answer, roomId });
    };

    const handleAnswer = async ({ answer }: { answer: RTCSessionDescriptionInit }) => {
      const pc = peerConnection.current;
      if (!pc) return;
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      await drainPendingCandidates();
    };

    const handleIceCandidate = async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
      const pc = peerConnection.current;
      if (!pc || !candidate) return;
      if (!pc.remoteDescription) {
        // Remote description not set yet — buffer and apply after setRemoteDescription
        pendingCandidates.current.push(candidate);
        return;
      }
      try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
    };

    signalingSocket.on('ice_config', handleIceConfig);
    signalingSocket.on('offer', handleOffer);
    signalingSocket.on('answer', handleAnswer);
    signalingSocket.on('ice_candidate', handleIceCandidate);

    // Explicitly join the room and request ICE config on connect (and reconnect).
    // The query-param join in handleConnection on the server is the primary path,
    // but this explicit emit is a reliable fallback that also handles reconnections.
    const handleSignalingConnect = () => {
      signalingSocket.emit('join_room', { roomId });
      signalingSocket.emit('get_ice_config');
    };

    if (signalingSocket.connected) {
      handleSignalingConnect();
    } else {
      signalingSocket.once('connect', handleSignalingConnect);
    }

    return () => {
      signalingSocket.off('ice_config', handleIceConfig);
      signalingSocket.off('offer', handleOffer);
      signalingSocket.off('answer', handleAnswer);
      signalingSocket.off('ice_candidate', handleIceCandidate);
      signalingSocket.off('connect', handleSignalingConnect);
    };
  }, [signalingSocket, role, roomId, createPeerConnection, addLocalStreamToPeer, drainPendingCandidates]);

  return {
    localStream: localStream.current,
    peerConnection: peerConnection.current,
    isConnected,
    connectionState,
    getUserMedia,
    startCall,
    toggleVideo,
    toggleAudio,
    stopMedia,
  };
}
