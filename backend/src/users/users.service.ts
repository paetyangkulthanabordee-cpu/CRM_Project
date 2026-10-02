import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from './entities/user.entity.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async findByEmail(email: string) {
    console.log('SEARCH EMAIL:', email);

    const user = await this.usersRepository.findOne({
      where: {
        email,
      },
    });

    console.log('FOUND USER:', user);

    return user;
  }
}