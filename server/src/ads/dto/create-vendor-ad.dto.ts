import { IsIn, IsInt, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateVendorAdDto {
  @IsString()
  productId: string;

  @IsIn(['Homepage placement', 'Sponsored products', 'Featured products'])
  placement: 'Homepage placement' | 'Sponsored products' | 'Featured products';

  @IsInt()
  @Type(() => Number)
  @IsIn([1, 2])
  days: 1 | 2;
}
