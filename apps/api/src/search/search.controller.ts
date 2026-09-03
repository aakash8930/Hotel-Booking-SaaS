import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchDto } from './search.dto';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  /**
   * Search for available properties and rooms.
   *
   * GET /api/v1/search?city=Manali&checkIn=2026-10-15&checkOut=2026-10-18&guests=2
   */
  @Get()
  async search(@Query() dto: SearchDto) {
    const results = await this.searchService.search(dto);
    return { success: true, data: results };
  }
}
