function highlightColumnsSingleColor(data) {
    const maxRow = data.length;
    const maxCol = data[0].length;

    const colorMap = Array.from({ length: maxRow }, () =>
        Array(maxCol).fill(null)
    );

    const pattern = {
        1: [61, 60, 17, 8, 75],   // bottom
        2: [55, 28, 11, 6, 47],   // middle
        3: [53, 29, 22, 75, 82]   // top
    };

    const columnColor = "lightblue"; // single color per matched column

    for (let c = 0; c < maxCol; c++) {

        let columnMatched = false;

        for (let r = 0; r <= maxRow - 3; r++) {

            const bottomVal = Number(data[r][c]);
            const middleVal = Number(data[r + 1][c]);
            const topVal = Number(data[r + 2][c]);

            const bottomMatch = pattern[1].includes(bottomVal);
            const middleMatch = pattern[2].includes(middleVal);
            const topMatch = pattern[3].includes(topVal);

            if (bottomMatch && middleMatch && topMatch) {
                columnMatched = true;
                break; // stop scanning this column
            }
        }

        // If column matched, color entire column
        if (columnMatched) {
            for (let r = 0; r < maxRow; r++) {
                colorMap[r][c] = columnColor;
            }
        }
    }

    return colorMap;
}
