export const rfidCatalog = [
  'RFID-001',
  'RFID-002',
  'RFID-003',
  'RFID-004',
  'RFID-005',
  'RFID-006',
  'RFID-007',
  'RFID-008',
  'RFID-A7F3-29C1',
  'RFID-B2D8-441A',
  'RFID-C09E1-7F20',
  'RFID-D4B6-93EF',
  'RFID-E8A2-1C74',
  'RFID-F1D5-8B03',
  'RFID-47E9-5DA2',
  'RFID-82C6-A1F7',
  'RFID-G6C4-22DA',
  'RFID-3B9F-6E48',
]

export const getAvailableRfidOptions = (evidenceRows = []) =>
  rfidCatalog.filter((tag) => !evidenceRows.some((entry) => entry.rfid === tag))
