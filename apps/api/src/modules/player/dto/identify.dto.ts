import { IsString, IsOptional, MinLength } from 'class-validator';

export class IdentifyDto {
  @IsString()
  @MinLength(1)
  sparkAddress!: string;

  @IsOptional()
  @IsString()
  sparkName?: string;
}
