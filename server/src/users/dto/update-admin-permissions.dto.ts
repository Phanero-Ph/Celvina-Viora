import { IsArray, IsString } from 'class-validator';

export class UpdateAdminPermissionsDto {
  @IsArray()
  @IsString({ each: true })
  permissions: string[];
}
