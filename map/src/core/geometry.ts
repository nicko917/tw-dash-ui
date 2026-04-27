export interface Point {
    x: number;
    y: number;
}

export class Geometry {
    /**
     * Computes the convex hull of a set of 2D points.
     * Uses the Monotone Chain algorithm.
     */
    static getConvexHull(points: Point[]): Point[] {
        if (points.length <= 3) return points;

        const sorted = [...points].sort((a, b) => a.x !== b.x ? a.x - b.x : a.y - b.y);
        
        const cross = (o: Point, a: Point, b: Point) => {
            return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
        };

        const lower: Point[] = [];
        for (const p of sorted) {
            while (lower.length >= 2 && cross(lower[lower.length - 2]!, lower[lower.length - 1]!, p) <= 0) {
                lower.pop();
            }
            lower.push(p);
        }

        const upper: Point[] = [];
        for (let i = sorted.length - 1; i >= 0; i--) {
            const p = sorted[i]!;
            while (upper.length >= 2 && cross(upper[upper.length - 2]!, upper[upper.length - 1]!, p) <= 0) {
                upper.pop();
            }
            upper.push(p);
        }

        upper.pop();
        lower.pop();
        return lower.concat(upper);
    }
}
