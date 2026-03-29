import { Module } from '@nestjs/common';
import { PatientGoalsService } from './patient-goals.service';
import { PatientGoalsController } from './patient-goals.controller';

@Module({
  controllers: [PatientGoalsController],
  providers: [PatientGoalsService],
  exports: [PatientGoalsService],
})
export class PatientGoalsModule {}
