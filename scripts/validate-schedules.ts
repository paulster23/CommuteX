#!/usr/bin/env node

/**
 * Manual schedule validation script
 * 
 * This script validates our app's train schedule data against subwaystats.com
 * for key stations (Carroll St and Jay St-MetroTech) in both directions.
 * 
 * Usage: npm run validate-schedules
 */

import { ScheduleValidationService } from '../src/services/ScheduleValidationService';

async function runManualValidation() {
  console.log('🚇 CommuteX Schedule Validation');
  console.log('================================');
  console.log('Validating train schedules against subwaystats.com...\n');

  try {
    const results = await ScheduleValidationService.runPeriodicValidation();
    
    console.log('\n📊 Validation Summary:');
    console.log(`• Total validations: ${results.length}`);
    console.log(`• Passed: ${results.filter(r => r.isValid).length}`);
    console.log(`• Failed: ${results.filter(r => !r.isValid).length}`);
    
    if (results.some(r => !r.isValid)) {
      console.log('\n⚠️  Issues found - check logs above for details');
      process.exit(1);
    } else {
      console.log('\n✅ All validations passed! Train schedules are accurate.');
      process.exit(0);
    }
  } catch (error) {
    console.error('\n❌ Validation failed:', error);
    process.exit(1);
  }
}

// Run validation if this script is executed directly
if (require.main === module) {
  runManualValidation();
}

export { runManualValidation };