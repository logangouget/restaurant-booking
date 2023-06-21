import { ApiProperty } from '@nestjs/swagger';

export class AddTableResponse {
  @ApiProperty()
  id: string;

  constructor(id: string) {
    this.id = id;
  }
}
