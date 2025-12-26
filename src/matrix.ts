export type Matrix = number[][];

export function transpose(matrix: Matrix): Matrix {
    return matrix[0]!.map((_, colIndex) => matrix.map(row => row[colIndex]!));
}

export function multiply(a: Matrix, b: Matrix): Matrix {
    const result: Matrix = Array.from({ length: a.length }, () => Array(b[0]!.length).fill(0));
    for (let i = 0; i < a.length; i++) {
        for (let j = 0; j < b[0]!.length; j++) {
            for (let k = 0; k < a[0]!.length; k++) {
                result[i]![j]! += a[i]![k]! * b[k]![j]!;
            }
        }
    }
    return result;
}

export function inverse(matrix: Matrix): Matrix | null {
    const n = matrix.length;
    const L = matrix.map((row, i) => [...row, ...Array(n).fill(0).map((_, j) => (i === j ? 1 : 0))]);

    for (let i = 0; i < n; i++) {
        let pivot = L[i]![i]!;
        if (Math.abs(pivot) < 1e-10) return null;

        for (let j = 0; j < 2 * n; j++) L[i]![j]! /= pivot;
        for (let k = 0; k < n; k++) {
            if (k !== i) {
                const factor = L[k]![i]!;
                for (let j = 0; j < 2 * n; j++) L![k]![j]! -= factor * L[i]![j]!;
            }
        }
    }
    return L.map(row => row.slice(n));
}
