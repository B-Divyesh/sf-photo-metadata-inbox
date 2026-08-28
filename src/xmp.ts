export interface ParsedMetadata {
  caption: string;
  keywords: string[];
}

const NS = {
  rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
  dc: 'http://purl.org/dc/elements/1.1/',
  x: 'adobe:ns:meta/'
};

export function parseXmp(source: string): ParsedMetadata {
  if (!source.trim()) return { caption: '', keywords: [] };
  const doc = new DOMParser().parseFromString(source, 'application/xml');
  if (doc.querySelector('parsererror')) throw new Error('This XMP sidecar is not valid XML.');
  const description = doc.getElementsByTagNameNS(NS.dc, 'description')[0];
  const caption = description?.getElementsByTagNameNS(NS.rdf, 'li')[0]?.textContent?.trim() ?? '';
  const subject = doc.getElementsByTagNameNS(NS.dc, 'subject')[0];
  const keywords = subject
    ? [...subject.getElementsByTagNameNS(NS.rdf, 'li')].map((node) => node.textContent?.trim() ?? '').filter(Boolean)
    : [];
  return { caption, keywords: unique(keywords) };
}

export function createXmp(source: string | undefined, caption: string, keywords: string[]): string {
  let doc: XMLDocument;
  if (source?.trim()) {
    doc = new DOMParser().parseFromString(source, 'application/xml');
    if (doc.querySelector('parsererror')) throw new Error('The original XMP is invalid, so it was not changed.');
  } else {
    doc = new DOMParser().parseFromString(
      `<?xml version="1.0" encoding="UTF-8"?><x:xmpmeta xmlns:x="${NS.x}"><rdf:RDF xmlns:rdf="${NS.rdf}"><rdf:Description xmlns:dc="${NS.dc}" /></rdf:RDF></x:xmpmeta>`,
      'application/xml'
    );
  }
  const rdf = doc.getElementsByTagNameNS(NS.rdf, 'RDF')[0];
  let description = doc.getElementsByTagNameNS(NS.rdf, 'Description')[0];
  if (!description) {
    description = doc.createElementNS(NS.rdf, 'rdf:Description');
    rdf.append(description);
  }

  let captionNode = doc.getElementsByTagNameNS(NS.dc, 'description')[0];
  if (!captionNode) {
    captionNode = doc.createElementNS(NS.dc, 'dc:description');
    description.append(captionNode);
  }
  captionNode.replaceChildren();
  const alt = doc.createElementNS(NS.rdf, 'rdf:Alt');
  const captionItem = doc.createElementNS(NS.rdf, 'rdf:li');
  captionItem.setAttribute('xml:lang', 'x-default');
  captionItem.textContent = caption;
  alt.append(captionItem);
  captionNode.append(alt);

  let subjectNode = doc.getElementsByTagNameNS(NS.dc, 'subject')[0];
  if (!subjectNode) {
    subjectNode = doc.createElementNS(NS.dc, 'dc:subject');
    description.append(subjectNode);
  }
  subjectNode.replaceChildren();
  const bag = doc.createElementNS(NS.rdf, 'rdf:Bag');
  unique(keywords).forEach((keyword) => {
    const item = doc.createElementNS(NS.rdf, 'rdf:li');
    item.textContent = keyword;
    bag.append(item);
  });
  subjectNode.append(bag);

  return `<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>\n${new XMLSerializer().serializeToString(doc)}\n<?xpacket end="w"?>`;
}

export function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export function sidecarName(filename: string): string {
  return filename.replace(/\.[^.]+$/, '') + '.xmp';
}
