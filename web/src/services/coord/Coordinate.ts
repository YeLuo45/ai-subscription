/**
 * Coordinate — geographic coordinate utilities
 *
 * Inspired by: geolib
 *
 * - DMS to decimal conversion
 * - Decimal to DMS
 * - Haversine distance
 * - Bearing
 * - Midpoint
 */

export class Coordinate {
  /**
   * Parse DMS (e.g., "40°26'46\"N") to decimal.
   */
  static parseDMS(dms: string): number {
    const re = /(\d+)[°d]\s*(\d+)['m]\s*(\d+(?:\.\d+)?)["s]?\s*([NSEW])?/i;
    const m = dms.match(re);
    if (!m) {
      const n = parseFloat(dms);
      if (isNaN(n)) throw new Error(`Invalid DMS: ${dms}`);
      return n;
    }
    const deg = parseInt(m[1], 10);
    const min = parseInt(m[2], 10);
    const sec = parseFloat(m[3]);
    let dec = deg + min / 60 + sec / 3600;
    if (m[4] && (m[4] === 'S' || m[4] === 'W')) dec = -dec;
    return dec;
  }

  /**
   * Convert decimal to DMS string.
   */
  static toDMS(decimal: number): string {
    const abs = Math.abs(decimal);
    const deg = Math.floor(abs);
    const min = Math.floor((abs - deg) * 60);
    const sec = ((abs - deg) * 60 - min) * 60;
    const dir = decimal >= 0 ? (decimal > 0 ? 'E' : '') : 'W';
    return `${deg}°${min}'${sec.toFixed(2)}"${dir}`;
  }

  /**
   * Haversine distance in km.
   */
  static haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // km
    const dLat = Coordinate._toRad(lat2 - lat1);
    const dLon = Coordinate._toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2
      + Math.cos(Coordinate._toRad(lat1)) * Math.cos(Coordinate._toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  /**
   * Initial bearing in degrees.
   */
  static bearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const dLon = Coordinate._toRad(lon2 - lon1);
    const y = Math.sin(dLon) * Math.cos(Coordinate._toRad(lat2));
    const x = Math.cos(Coordinate._toRad(lat1)) * Math.sin(Coordinate._toRad(lat2))
      - Math.sin(Coordinate._toRad(lat1)) * Math.cos(Coordinate._toRad(lat2)) * Math.cos(dLon);
    return (Coordinate._toDeg(Math.atan2(y, x)) + 360) % 360;
  }

  /**
   * Midpoint of two coordinates.
   */
  static midpoint(lat1: number, lon1: number, lat2: number, lon2: number): { lat: number; lon: number } {
    const dLon = Coordinate._toRad(lon2 - lon1);
    const lat1r = Coordinate._toRad(lat1);
    const lat2r = Coordinate._toRad(lat2);
    const lon1r = Coordinate._toRad(lon1);
    const Bx = Math.cos(lat2r) * Math.cos(dLon);
    const By = Math.cos(lat2r) * Math.sin(dLon);
    const lat = Math.atan2(Math.sin(lat1r) + Math.sin(lat2r), Math.sqrt((Math.cos(lat1r) + Bx) ** 2 + By ** 2));
    const lon = lon1r + Math.atan2(By, Math.cos(lat1r) + Bx);
    return { lat: Coordinate._toDeg(lat), lon: Coordinate._toDeg(lon) };
  }

  /**
   * Bounding box for a center point and radius (km).
   */
  static boundingBox(lat: number, lon: number, radiusKm: number): { minLat: number; maxLat: number; minLon: number; maxLon: number } {
    const dLat = radiusKm / 111.32;
    const dLon = radiusKm / (111.32 * Math.cos(Coordinate._toRad(lat)));
    return { minLat: lat - dLat, maxLat: lat + dLat, minLon: lon - dLon, maxLon: lon + dLon };
  }

  /**
   * Check if coordinate is valid.
   */
  static isValid(lat: number, lon: number): boolean {
    return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
  }

  private static _toRad(deg: number): number {
    return (deg * Math.PI) / 180;
  }

  private static _toDeg(rad: number): number {
    return (rad * 180) / Math.PI;
  }
}
