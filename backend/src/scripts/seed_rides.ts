
import { rideRepository } from '../repositories/ride.repository.ts';
import { logger } from '../utils/logger.ts';

async function seed() {
  logger.info('Seeding rides...');
  try {
    // Add sample rides
    await rideRepository.create({
      rider_id: 'user_1',
      pickup_address: '123 Main St',
      pickup_latitude: 12.9716,
      pickup_longitude: 77.5946,
      destination_address: '456 Oak St',
      destination_latitude: 12.9234,
      destination_longitude: 77.6000,
      distance_km: 5.2,
      estimated_duration_minutes: 15,
      estimated_fare: 150,
      ride_type: 'economy'
    }, [
      { stop_order: 1, address: '123 Main St', latitude: 12.9716, longitude: 77.5946 },
      { stop_order: 2, address: '456 Oak St', latitude: 12.9234, longitude: 77.6000 }
    ]);
    logger.info('Sample rides seeded.');
  } catch (err) {
    logger.error('Failed to seed rides', { error: (err as Error).message });
  }
}

seed();
