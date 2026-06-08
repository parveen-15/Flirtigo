import { IsString, IsUUID, IsOptional, IsEnum, MaxLength } from 'class-validator';

export class CreateReportDto {
  @IsUUID()
  reportedId: string;

  @IsOptional()
  @IsUUID()
  matchId?: string;

  @IsEnum(['harassment', 'nudity', 'spam', 'hate_speech', 'underage', 'violence', 'other'])
  reason: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
