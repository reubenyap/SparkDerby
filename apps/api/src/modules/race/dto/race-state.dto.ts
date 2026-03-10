import { IsString, IsOptional } from 'class-validator';

export class RaceQueryDto {
  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;
}
