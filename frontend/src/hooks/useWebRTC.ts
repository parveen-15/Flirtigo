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
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>('new');

  const createPeerConnection = useCallback((iceServers: RTCIceServer[]) => {
    const pc = new RTCPeerConnection({ iceServers, iceCandidatePoolSize: 10 });

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        signalingSocket.emit('ice_candidate', { candidate, roomId });
      }
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
      if (pc.iceConnectionState === 'failed') {
        pc.restartIce();
      }
    };

    return pc;
  }, [roomId, signalingSocket, onRemoteStream, onConnectionStateChange]);

  const getUserMedia = useCallback(async (video: boolean, audio: boolean) => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: video ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } : false,
      audio: audio ? { echoCancellation: true, noiseSuppression: true, sampleRate: 44100 } : false,
    });
    localStream.current = stream;
    return stream;
  }, []);

  const addLocalStreamToPeer = useCallback((stream: MediaStream) => {
    const pc = peerConnection.current;
    if (!pc) return;
    stream.getTracks().forEach(track => pc.addTrack(track, stream));
  }, []);

  const startCall = useCallback(async (stream: MediaStream) => {
    const pc = peerConnection.current;
    if (!pc) return;

    addLocalStreamToPeer(stream);

    if (role === 'caller') {
      const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
      await pc.setLocalDescription(offer);
      signalingSocket.emit('offer', { offer, roomId });
    }
  }, [role, roomId, signalingSocket, addLocalStreamToPeer]);

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
    setIsConnected(false);
  }, []);

  // Socket event handlers
  useEffect(() => {
    const handleIceConfig = ({ iceServers }: { iceServers: RTCIceServer[] }) => {
      peerConnection.current = createPeerConnection(iceServers);
    };

    const handleOffer = async ({ offer }: { offer: RTCSessionDescriptionInit }) => {
      const pc = peerConnection.current;
      if (!pc || role !== 'callee') return;
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      if (localStream.current) addLocalStreamToPeer(localStream.current);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      signalingSocket.emit('answer', { answer, roomId });
    };

    const handleAnswer = async ({ answer }: { answer: RTCSessionDescriptionInit }) => {
      const pc = peerConnection.current;
      if (!pc) return;
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    };

    const handleIceCandidate = async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
      const pc = peerConnection.current;
      if (!pc || !candidate) return;
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {}
    };

    signalingSocket.on('ice_config', handleIceConfig);
    signalingSocket.on('offer', handleOffer);
    signalingSocket.on('answer', handleAnswer);
    signalingSocket.on('ice_candidate', handleIceCandidate);

    // Request ICE config on connect
    signalingSocket.emit('get_ice_config');

    return () => {
      signalingSocket.off('ice_config', handleIceConfig);
      signalingSocket.off('offer', handleOffer);
      signalingSocket.off('answer', handleAnswer);
      signalingSocket.off('ice_candidate', handleIceCandidate);
    };
  }, [signalingSocket, role, roomId, createPeerConnection, addLocalStreamToPeer]);

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
