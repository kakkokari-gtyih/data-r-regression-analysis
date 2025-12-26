import { promises as fsp } from 'fs';
import * as path from 'path';

/**
 * 回帰分析の計算を行います。
 * @param x 入力 X
 * @param y 入力 Y
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

async function main() {
    const dataFilePath = path.join(import.meta.dirname, '..', 'data.csv');
    const file = await fsp.readFile(dataFilePath, 'utf-8');
    const lines = file.split('\n').filter(line => line.trim() !== '');

    const nk225Values: number[] = [];
    const companies: Record<string, number[]> = {};

    const header = lines.shift()?.split(',');
    for (const hCell of header?.slice(2) ?? []) {
        companies[hCell!] = [];
    }

    for (const line of lines) {
        const cells = line.split(',');
        nk225Values.push(parseFloat(cells[1]!));
        cells.slice(2).forEach((cell, index) => {
            const company = header?.[index + 2]!;
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

    // 企業全体と日経平均の回帰分析
    const allValues: number[] = [];
    const numCompanies = Object.keys(companies).length;
    for (let i = 0; i < nk225Values.length; i++) {
        let sum = 0;
        for (const values of Object.values(companies)) {
            sum += values[i]!;
        }
        allValues.push(sum / numCompanies);
    }
    const { slope, intercept, r2 } = getValues(allValues, nk225Values);
    const overallResult = `- 傾き: ${slope.toFixed(4)}
- 切片: ${intercept.toFixed(4)}
- 決定係数 $R^2$: ${r2.toFixed(4)}`;

    const resultContent = `# 回帰分析結果

## 各企業と日経平均の回帰分析結果
${results.join('\n\n')}

## 全企業平均と日経平均の回帰分析結果
${overallResult}
`;
    const resultFilePath = path.join(import.meta.dirname, '..', 'results.md');
    await fsp.writeFile(resultFilePath, resultContent, 'utf-8');
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
