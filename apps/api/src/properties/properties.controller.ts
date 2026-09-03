import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PropertiesService } from './properties.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller()
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  /**
   * Create a new property (host only).
   */
  @Post('host/properties')
  @UseGuards(JwtAuthGuard)
  async create(
    @CurrentUser('sub') hostId: string,
    @Body() dto: CreatePropertyDto,
  ) {
    const property = await this.propertiesService.create(hostId, dto);
    return { success: true, data: property };
  }

  /**
   * Get all properties for the authenticated host.
   */
  @Get('host/properties')
  @UseGuards(JwtAuthGuard)
  async findAll(@CurrentUser('sub') hostId: string) {
    const properties = await this.propertiesService.findAllByHost(hostId);
    return { success: true, data: properties };
  }

  /**
   * Get a single property by ID (host must own it).
   */
  @Get('host/properties/:id')
  @UseGuards(JwtAuthGuard)
  async findOne(
    @CurrentUser('sub') hostId: string,
    @Param('id') id: string,
  ) {
    const property = await this.propertiesService.findOne(hostId, id);
    return { success: true, data: property };
  }

  /**
   * Update a property.
   */
  @Put('host/properties/:id')
  @UseGuards(JwtAuthGuard)
  async update(
    @CurrentUser('sub') hostId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePropertyDto,
  ) {
    const property = await this.propertiesService.update(hostId, id, dto);
    return { success: true, data: property };
  }

  /**
   * Delete (suspend) a property.
   */
  @Delete('host/properties/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async remove(
    @CurrentUser('sub') hostId: string,
    @Param('id') id: string,
  ) {
    const result = await this.propertiesService.remove(hostId, id);
    return { success: true, ...result };
  }

  /**
   * Get a property by slug (public, for guest-facing pages).
   */
  @Get('properties/:slug')
  async findOneBySlug(@Param('slug') slug: string) {
    const property = await this.propertiesService.findOneBySlug(slug);
    return { success: true, data: property };
  }
}
