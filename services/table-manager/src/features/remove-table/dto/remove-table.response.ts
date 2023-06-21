import { ApiProperty } from '@nestjs/swagger';

export class RemoveTableResponse {
  @ApiProperty({
    description: 'The id of the removed table',
  })
  id: string;

  constructor(id: string) {
    this.id = id;
  }
}
