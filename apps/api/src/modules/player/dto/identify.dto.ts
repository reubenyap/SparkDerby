import { IsString, IsOptional, MinLength, MaxLength, Matches } from 'class-validator';

export class IdentifyDto {
  @IsString()
  @MinLength(10)
  @MaxLength(200)
  @Matches(/^sm1[a-zA-Z0-9]+$/, {
    message: 'sparkAddress must be a valid Spark address starting with sm1',
  })
  sparkAddress!: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(64)
  @Matches(/^[a-zA-Z0-9._-]+\.spark$/, {
    message: 'sparkName must be a valid .spark name',
  })
  sparkName?: string;
}
