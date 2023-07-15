import { ApiProperty } from '@nestjs/swagger';

export class TableData {
  @ApiProperty()
  id: string;

  @ApiProperty()
  seats: number;
}

export class ListTablesResponse {
  @ApiProperty({ type: [TableData] })
  tables: TableData[];

  constructor(tables: TableData[]) {
    this.tables = tables;
  }
}
