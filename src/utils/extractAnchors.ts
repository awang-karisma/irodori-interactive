export async function extractAnchors(page: any) {
  const textContent = await page.getTextContent();
  const items = textContent.items;
  const anchors: any[] = [];

  for (let i = 0; i < items.length; i++) {
    const str = items[i].str;

    if (/\d{2}-\d{2}/.test(str)) {
      anchors.push({
        id: str,
        x: items[i].transform[4],
        y: items[i].transform[5],
        width: items[i].width,
        height: items[i].height
      });
    }

    if (
      i < items.length - 2 &&
      /\d{2}/.test(items[i].str) &&
      items[i + 1].str === "-" &&
      /\d{2}/.test(items[i + 2].str)
    ) {
      anchors.push({
        id: `${items[i].str}-${items[i + 2].str}`,
        x: items[i].transform[4],
        y: items[i].transform[5],
        width: items[i].width,
        height: items[i].height
      });
    }
  }

  return anchors;
}