import { IsString, IsOptional, IsArray, IsBoolean, MaxLength, IsEnum } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  bio?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  interests?: string[];

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsEnum(['video', 'voice', 'text'])
  preferredMatchType?: string;

  @IsOptional()
  @IsBoolean()
  ageVerified?: boolean;

  @IsOptional()
  @IsBoolean()
  anonymousMode?: boolean;

  @IsOptional()
  @IsBoolean()
  showCity?: boolean;

  @IsOptional()
  @IsBoolean()
  showState?: boolean;
}
