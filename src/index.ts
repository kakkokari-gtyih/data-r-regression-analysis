import { promises as fsp } from 'fs';
import * as path from 'path';
import type { Matrix } from './matrix.js';
import { transpose, multiply, inverse } from './matrix.js';

function normalizeName(name: string): string {
    return name.replace(/["\n]/g, '').trim();
}

/**
 * 単回帰分析の計算を行います。
 * @param x 説明変数
 * @param y 目的変数
 * @returns 傾き、切片、決定係数 R^2
 */
function getValues(x: number[], y: number[]): {
    slope: number;
    intercept: number;
    r2: number;
} {
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i]!, 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

    // 傾き
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

    // 切片
    const intercept = (sumY - slope * sumX) / n;

    // 決定係数R^2
    const r2 = Math.pow((n * sumXY - sumX * sumY) / Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY)), 2);

    return { slope, intercept, r2 };
}

/**
 * 重回帰分析の計算を行います。
 * @param X 説明変数
 * @param y 目的変数
 * @returns 切片と各説明変数の傾き、決定係数 R^2
 */
function multipleRegression(X: Matrix, y: number[]): {
    intercept: number;
    slopes: number[];
    r2: number;
} {
    const Xb: Matrix = X.map(row => [1, ...row]);
    const Xt = transpose(Xb);
    const XtX = multiply(Xt, Xb);
    const XtXInverted = inverse(XtX);
    if (XtXInverted === null) {
        throw new Error();
    }

    const XtY: Matrix = multiply(Xt, y.map(value => [value]));
    const B: Matrix = multiply(XtXInverted, XtY);

    const coefficients = B.map(row => row[0]!);
    const intercept = coefficients[0]!;
    const slopes = coefficients.slice(1);

    const yMean = y.reduce((a, b) => a + b, 0) / y.length;
    const ssTotal = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
    const yPredicted = Xb.map(row => {
        return coefficients.reduce((sum, coeff, index) => sum + coeff * row[index]!, 0);
    });
    const ssResidual = y.reduce((sum, yi, i) => sum + Math.pow(yi - yPredicted[i]!, 2), 0);
    const r2 = 1 - ssResidual / ssTotal;

    return { intercept, slopes, r2 };
}

async function main() {
    const dataFilePath = path.join(import.meta.dirname, '..', 'data.csv');
    const file = await fsp.readFile(dataFilePath, 'utf-8');
    const lines = file.split('\n').filter(line => line.trim() !== '');

    const nk225Values: number[] = [];
    const companies: Record<string, number[]> = {};

    const header = lines.shift()?.split(',');
    for (const hCell of header?.slice(2) ?? []) {
        const cellName = normalizeName(hCell!);
        companies[cellName] = [];
    }

    for (const line of lines) {
        const cells = line.split(',');
        nk225Values.push(parseFloat(cells[1]!));
        cells.slice(2).forEach((cell, index) => {
            const company = normalizeName(header![index + 2]!);
            companies[company]!.push(parseFloat(cell));
        });
    }

    // それぞれの企業と日経平均の回帰分析
    // 傾き・切片・決定係数を計算
    const results: string[] = [];
    for (const [company, values] of Object.entries(companies)) {
        const { slope, intercept, r2 } = getValues(values, nk225Values);
        results.push(`### ${company}
- 傾き: ${slope.toFixed(4)}
- 切片: ${intercept.toFixed(4)}
- 決定係数 $R^2$: ${r2.toFixed(4)}`);
    }

    // 企業全体と日経平均の重回帰分析
    const X: Matrix = Object.values(companies);
    const { intercept, slopes, r2 } = multipleRegression(transpose(X), nk225Values);
    const overallResult = `- 切片: ${intercept.toFixed(4)}
- 決定係数 $R^2$: ${r2.toFixed(4)}
- 各企業の傾き:
${slopes.map((slope, index) => `  - ${Object.keys(companies)[index]}: ${slope.toFixed(4)}`).join('\n')}`;

    const resultContent = `# 回帰分析結果

## 各企業と日経平均の単回帰分析結果
${results.join('\n\n')}

## 全企業平均と日経平均の重回帰分析結果
${overallResult}
`;
    const resultFilePath = path.join(import.meta.dirname, '..', 'results.md');
    await fsp.writeFile(resultFilePath, resultContent, 'utf-8');
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
