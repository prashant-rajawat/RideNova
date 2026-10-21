// Central Vadodara: ~22.3072° N, 73.1812° E
const CENTER_LAT = 22.3072;
const CENTER_LNG = 73.1812;
const RADIUS_KM = 50;

export function isWithinServiceArea(lat: number, lng: number): boolean {
  const R = 6371; // Earth's radius in km
  const dLat = (lat - CENTER_LAT) * (Math.PI / 180);
  const dLng = (lng - CENTER_LNG) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(CENTER_LAT * (Math.PI / 180)) *
      Math.cos(lat * (Math.PI / 180)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return distance <= RADIUS_KM;
}
