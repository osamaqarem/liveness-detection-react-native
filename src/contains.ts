export interface Rect {
    minX: number
    minY: number
    width: number
    height: number
}

interface Contains {
    outside: Rect
    inside: Rect
}

export function contains({ outside, inside }: Contains) {
    const outsideMaxX = outside.minX + outside.width
    const insideMaxX = inside.minX + inside.width

    const outsideMaxY = outside.minY + outside.height
    const insideMaxY = inside.minY + inside.height

    if (inside.minX < outside.minX) {
        return false
    }
    if (insideMaxX > outsideMaxX) {
        return false
    }
    if (inside.minY < outside.minY) {
        return false
    }
    if (insideMaxY > outsideMaxY) {
        return false
    }

    return true
}

export function contains2({ outside, inside }: Contains) {
    const outsideMaxX = outside.minX + outside.width
    const insideMaxX = inside.minX + inside.width

    const outsideMaxY = outside.minY + outside.height
    const insideMaxY = inside.minY + inside.height

    const xIntersect = Math.max(0, Math.min(insideMaxX, outsideMaxX) - Math.max(inside.minX, outside.minX))
    const yIntersect = Math.max(0, Math.min(insideMaxY, outsideMaxY) - Math.max(inside.minY, outside.minY))
    const intersectArea = xIntersect * yIntersect

    const insideArea = inside.width * inside.height
    const outsideArea = outside.width * outside.height

    const unionArea = insideArea + outsideArea - intersectArea

    return unionArea === outsideArea
}