import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import Modal from '../../components/Modal';
import { useFilterPanel, FilterPanel } from '../../components/ColumnFilter';
import { loadFleetRows, saveFleetRows } from '../../utils/fleetSync';
import { loadOperationalLocations } from '../../config/operations-store';
import { BUSINESS_SETUP_UPDATED_EVENT, getActiveBusinessTypes, getActiveVehicleTypes, loadBusinessSetup } from '../../config/business-setup';
import {
  STAFF_UPDATED_EVENT,
  VEHICLE_DRIVERS_UPDATED_EVENT,
  getAssignedVehicleIdForDriver,
  loadOperationalStaff,
  loadVehicleDrivers,
  saveVehicleDrivers,
  todayKey,
  upsertVehicleDriverAssignment,
} from '../../config/staff-operations-store';
import { isApiIntegrationEnabled } from '../../api/runtime';
import { createVehicle, deleteVehicle, listVehicles, lockVehicle, unlockVehicle, updateVehicle } from '../../api/services/vehiclesService';

const StationMap = lazy(() => import('../../components/StationMap').then((module) => ({ default: module.StationMap })));
const QRCode = lazy(() => import('qrcode.react').then((module) => ({ default: module.QRCodeSVG })));

const SEED = [];

const LOCATION_OPTIONS = [
  'Unassigned',
  'New Delhi Campus Loop',
  'MumbaiRide Business District',
  'BLR GreenFleet Tech Corridor',
  'HYD Smart Move Zone',
  'Pune Campus Rides',
  'Chennai CycleNet Coastal',
];

const LOCATION_COORDINATES = {
  'New Delhi Campus Loop': '28.5921,77.2040',
  'MumbaiRide Business District': '19.0760,72.8777',
  'BLR GreenFleet Tech Corridor': '12.9716,77.5946',
  'HYD Smart Move Zone': '17.3850,78.4867',
  'Pune Campus Rides': '18.5204,73.8567',
  'Chennai CycleNet Coastal': '13.0827,80.2707',
  Unassigned: '20.5937,78.9629',
};

const STATUS_CLASS = { Active: 'completed', Offline: 'cancelled', Maintenance: 'processing' };
const VALID_STATUSES = new Set(['Active', 'Offline', 'Maintenance']);

const FALLBACK_VEHICLE_TYPES = [
  { name: 'Cycle', seatCount: 1, driverApplicable: false },
  { name: 'E-Bike', seatCount: 1, driverApplicable: false },
  { name: 'E-Scooter', seatCount: 1, driverApplicable: false },
  { name: 'Buggy', seatCount: 4, driverApplicable: true },
  { name: 'Bus', seatCount: 24, driverApplicable: true },
  { name: 'E-Buggy', seatCount: 4, driverApplicable: true },
  { name: 'Shuttle Bus', seatCount: 24, driverApplicable: true },
];

const COLUMNS = [
  { key: 'id', label: 'Vehicle ID' },
  { key: 'qr', label: 'QR ID' },
  { key: 'type', label: 'Type' },
  { key: 'seats', label: 'Seats' },
  { key: 'driverMode', label: 'Driver' },
  { key: 'assignedDriverName', label: 'Assigned Driver', type: 'text' },
  { key: 'biz', label: 'Business Type' },
  { key: 'org', label: 'Organization' },
  { key: 'location', label: 'Location' },
  { key: 'status', label: 'Status' },
  { key: 'locked', label: 'Lock' },
];

function blank(defaultType = 'E-Bike') {
  return { type: defaultType, mode: 'single', prefix: 'VH-', count: 1, biz: '', org: '', location: 'Unassigned', status: 'Active', locked: 'unlocked', driverId: '' };
}

function getVehicleTypeCatalog(businessSetup, rows = []) {
  const configuredTypes = getActiveVehicleTypes(businessSetup);
  const catalog = {};
  configuredTypes.forEach((item) => {
    catalog[item.name] = item;
  });
  FALLBACK_VEHICLE_TYPES.forEach((item) => {
    if (!catalog[item.name]) catalog[item.name] = item;
  });
  rows.forEach((row) => {
    if (row?.type && !catalog[row.type]) {
      catalog[row.type] = { name: row.type, seatCount: 1, driverApplicable: false };
    }
  });
  return catalog;
}

function toCellKey(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function pickCell(raw, keys) {
  const wanted = new Set(keys.map(toCellKey));
  const foundKey = Object.keys(raw).find((key) => wanted.has(toCellKey(key)));
  return foundKey ? raw[foundKey] : '';
}

function parseBool(input) {
  const value = String(input || '').trim().toLowerCase();
  return value === '1' || value === 'true' || value === 'yes' || value === 'locked';
}

export default function VehiclesPage() {
  const usingApi = isApiIntegrationEnabled();
  const [businessSetup, setBusinessSetup] = useState(loadBusinessSetup);
  const [rows, setRows] = useState(() => loadFleetRows(SEED));
  const [staffRows, setStaffRows] = useState(() => loadOperationalStaff([]));
  const [vehicleDriverRows, setVehicleDriverRows] = useState(() => loadVehicleDrivers([]));
  const [selected, setSelected] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showAllocate, setShowAllocate] = useState(false);
  const [showQrImportModal, setShowQrImportModal] = useState(false);
  const [showQrAutoAllocateModal, setShowQrAutoAllocateModal] = useState(false);
  const [showQrViewModal, setShowQrViewModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [locationRows, setLocationRows] = useState(() => loadOperationalLocations([]));
  const [detailVehicle, setDetailVehicle] = useState(null);
  const [editingVehicleId, setEditingVehicleId] = useState(null);
  const [bulkFileName, setBulkFileName] = useState('');
  const [bulkPreviewCount, setBulkPreviewCount] = useState(0);
  const [isBulkQrDownloading, setIsBulkQrDownloading] = useState(false);
  const [vehiclesMode, setVehiclesMode] = useState(usingApi ? 'API' : 'Local');
  const [vehiclesSyncError, setVehiclesSyncError] = useState('');
  const [isVehiclesLoading, setIsVehiclesLoading] = useState(false);

  const vehicleTypeCatalog = useMemo(() => getVehicleTypeCatalog(businessSetup, rows), [businessSetup, rows]);
  const vehicleTypeOptions = useMemo(() => Object.keys(vehicleTypeCatalog), [vehicleTypeCatalog]);
  const activeBusinessTypes = useMemo(() => getActiveBusinessTypes(businessSetup), [businessSetup]);
  const [form, setForm] = useState(() => blank(vehicleTypeOptions[0] || 'E-Bike'));
  const [allocationForm, setAllocationForm] = useState({ location: 'Unassigned', org: '' });
  const [qrImportPrefix, setQrImportPrefix] = useState('QR-55');
  const [qrPreview, setQrPreview] = useState({ id: '', qr: '' });
  const [scanQrInput, setScanQrInput] = useState('');
  const [scanDriverId, setScanDriverId] = useState('');
  const [scanStationScopeId, setScanStationScopeId] = useState('');

  const fp = useFilterPanel();

  const staffNameById = useMemo(() => staffRows.reduce((acc, row) => {
    acc[row.id] = row.name;
    return acc;
  }, {}), [staffRows]);

  const driverByVehicleId = useMemo(() => vehicleDriverRows.reduce((acc, row) => {
    acc[row.vehicle_id] = row.driver_id;
    return acc;
  }, {}), [vehicleDriverRows]);

  const activeDrivers = useMemo(
    () => staffRows.filter((row) => row.role === 'driver' && row.status === 'active'),
    [staffRows]
  );

  const stationOptions = useMemo(() => locationRows.flatMap((location) =>
    (location.stations || []).map((station) => ({
      scopeId: `${location.id}::${station.id}`,
      locationName: location.name,
      stationName: station.name,
      locationPin: station.locationPin,
    }))
  ), [locationRows]);

  const scannedVehicle = useMemo(() => {
    const query = scanQrInput.trim().toLowerCase();
    if (!query) return null;
    return rows.find((row) => row.qr.toLowerCase() === query || row.id.toLowerCase() === query) || null;
  }, [rows, scanQrInput]);

  const scannedVehicleMeta = useMemo(
    () => vehicleTypeCatalog[scannedVehicle?.type] || { driverApplicable: false },
    [scannedVehicle, vehicleTypeCatalog]
  );

  const selectedStation = useMemo(
    () => stationOptions.find((station) => station.scopeId === scanStationScopeId) || null,
    [scanStationScopeId, stationOptions]
  );

  const enrichedRows = useMemo(() => rows.map((row) => {
    const meta = vehicleTypeCatalog[row.type] || { seatCount: 1, driverApplicable: false };
    const assignedDriverId = driverByVehicleId[row.id] || '';
    return {
      ...row,
      seats: Number(meta.seatCount) || 1,
      driverApplicable: Boolean(meta.driverApplicable),
      driverMode: meta.driverApplicable ? 'Driver Required' : 'Self Ride',
      driverId: assignedDriverId,
      assignedDriverName: assignedDriverId ? (staffNameById[assignedDriverId] || 'Unknown') : 'Unassigned',
    };
  }), [driverByVehicleId, rows, staffNameById, vehicleTypeCatalog]);

  const flat = useMemo(() => enrichedRows.map((r) => ({ ...r, locked: r.locked ? 'Locked' : 'Unlocked' })), [enrichedRows]);
  const visible = useMemo(() => flat.filter((r) => COLUMNS.every((c) => fp.match(c.key, r[c.key]))), [flat, fp.filters]);
  const visibleFull = useMemo(() => rows.filter((r) => visible.some((v) => v.id === r.id)), [rows, visible]);
  const selectedTypeMeta = vehicleTypeCatalog[form.type] || { seatCount: 1, driverApplicable: false };
  const activeCount = rows.filter((r) => r.status === 'Active').length;
  const offlineCount = rows.filter((r) => r.status === 'Offline').length;
  const maintenanceCount = rows.filter((r) => r.status === 'Maintenance').length;
  const lockedCount = rows.filter((r) => r.locked).length;

  const allChecked = visible.length > 0 && visible.every((r) => selected.includes(r.id));

  const getNextVehicleSequence = (currentRows) => currentRows.reduce((max, row) => {
    const match = String(row.id).match(/(\d+)$/);
    const value = match ? Number(match[1]) : 0;
    return Math.max(max, value);
  }, 0) + 1;

  const getNextQrSequence = (currentRows) => currentRows.reduce((max, row) => {
    const match = String(row.qr || '').match(/(\d+)$/);
    const value = match ? Number(match[1]) : 0;
    return Math.max(max, value);
  }, 4400) + 1;

  const reportVehiclesApiError = (actionLabel, error) => {
    setVehiclesSyncError(`${actionLabel} failed in API mode: ${error?.message || 'Unknown error'}. Local state was updated.`);
  };

  const f = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));
  const toggleAll = (checked) => setSelected(checked ? visible.map((r) => r.id) : []);
  const toggleRow = (id, checked) => setSelected((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)));

  const deleteRow = async (id) => {
    if (!window.confirm('Delete this vehicle?')) return;
    if (usingApi) {
      try {
        await deleteVehicle(id);
      } catch (error) {
        reportVehiclesApiError('Delete vehicle', error);
      }
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
    setSelected((prev) => prev.filter((x) => x !== id));
    const nextAssignments = vehicleDriverRows.filter((row) => row.vehicle_id !== id);
    setVehicleDriverRows(nextAssignments);
    saveVehicleDrivers(nextAssignments);
  };

  const toggleLock = async (id) => {
    const current = rows.find((row) => row.id === id);
    const nextLocked = !current?.locked;
    if (usingApi && current) {
      try {
        if (nextLocked) { await lockVehicle(String(current.apiId || current.id)); } else { await unlockVehicle(String(current.apiId || current.id)); }
      } catch (error) {
        reportVehiclesApiError(nextLocked ? 'Lock vehicle' : 'Unlock vehicle', error);
      }
    }
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, locked: nextLocked } : r)));
  };

  const openCreateModal = (mode = 'single') => {
    setEditingVehicleId(null);
    setForm({ ...blank(vehicleTypeOptions[0] || 'E-Bike'), mode });
    setShowAdd(true);
  };

  const openEditVehicle = (row) => {
    if (!row) return;
    setEditingVehicleId(row.id);
    setForm({
      type: row.type,
      mode: 'single',
      prefix: row.id.replace(/\d+$/, ''),
      count: 1,
      biz: row.biz,
      org: row.org,
      location: row.location || 'Unassigned',
      status: row.status,
      locked: row.locked ? 'locked' : 'unlocked',
      driverId: driverByVehicleId[row.id] || '',
    });
    setShowAdd(true);
  };

  const handleCreate = async () => {
    if (editingVehicleId) {
      const nextLocation = form.location || 'Unassigned';
      const nextLocationPin = LOCATION_COORDINATES[nextLocation] || '20.5937,78.9629';
      const editedMeta = vehicleTypeCatalog[form.type] || { driverApplicable: false };

      if (editedMeta.driverApplicable && form.driverId) {
        const assignedVehicleId = getAssignedVehicleIdForDriver(vehicleDriverRows, form.driverId);
        if (assignedVehicleId && assignedVehicleId !== editingVehicleId) {
          window.alert('This driver is already assigned to another vehicle. Reassign first.');
          return;
        }
      }

      const editedRow = {
        id: editingVehicleId,
        type: form.type,
        biz: form.biz || 'General',
        org: form.org || 'Global Pool',
        location: nextLocation,
        locationPin: nextLocationPin,
        status: form.status,
        locked: form.locked === 'locked',
        qr: rows.find((row) => row.id === editingVehicleId)?.qr || '',
      };

      if (usingApi) {
        try {
          const updated = await updateVehicle(editedRow);
          setRows((current) => current.map((row) => (row.id === editingVehicleId ? { ...row, ...updated } : row)));
        } catch (error) {
          reportVehiclesApiError('Update vehicle', error);
          setRows((current) => current.map((row) => (
            row.id === editingVehicleId
              ? {
                  ...row,
                  ...editedRow,
                }
              : row
          )));
        }
      } else {
        setRows((current) => current.map((row) => (
          row.id === editingVehicleId
            ? {
                ...row,
                ...editedRow,
              }
            : row
        )));
      }

      const nextAssignments = upsertVehicleDriverAssignment(
        vehicleDriverRows,
        editingVehicleId,
        editedMeta.driverApplicable ? form.driverId : ''
      );
      setVehicleDriverRows(nextAssignments);
      saveVehicleDrivers(nextAssignments);

      setEditingVehicleId(null);
      setForm(blank(vehicleTypeOptions[0] || 'E-Bike'));
      setShowAdd(false);
      return;
    }

    const count = form.mode === 'multi' ? parseInt(form.count, 10) || 1 : 1;
    const nextVehicleSequence = getNextVehicleSequence(rows);
    const nextQrSequence = getNextQrSequence(rows);
    const nextMeta = vehicleTypeCatalog[form.type] || { seatCount: 1, driverApplicable: false };
    const nextLocation = form.location || 'Unassigned';
    const nextLocationPin = LOCATION_COORDINATES[nextLocation] || '20.5937,78.9629';

    const nextRows = Array.from({ length: count }, (_, i) => ({
      id: `${form.prefix}${String(nextVehicleSequence + i).padStart(3, '0')}`,
      qr: `QR-${nextQrSequence + i}`,
      type: form.type,
      seats: nextMeta.seatCount,
      driverApplicable: nextMeta.driverApplicable,
      biz: form.biz || 'General',
      org: form.org || 'Global Pool',
      location: nextLocation,
      locationPin: nextLocationPin,
      status: form.status,
      locked: form.locked === 'locked',
    }));

    if (nextMeta.driverApplicable && form.driverId && nextRows.length === 1) {
      const assignedVehicleId = getAssignedVehicleIdForDriver(vehicleDriverRows, form.driverId);
      if (assignedVehicleId) {
        window.alert('This driver is already assigned to another vehicle. Reassign first.');
        return;
      }
    }

    if (usingApi && nextRows.length === 1) {
      try {
        const created = await createVehicle(nextRows[0]);
        setRows((prev) => [...prev, created]);
      } catch (error) {
        reportVehiclesApiError('Create vehicle', error);
        setRows((prev) => [...prev, ...nextRows]);
      }
    } else {
      if (usingApi && nextRows.length > 1) {
        setVehiclesSyncError('Bulk create currently runs in local mode for safety. You can still upload/import and sync progressively.');
      }
      setRows((prev) => [...prev, ...nextRows]);
    }

    if (nextMeta.driverApplicable && form.driverId && nextRows.length === 1) {
      const nextAssignments = upsertVehicleDriverAssignment(vehicleDriverRows, nextRows[0].id, form.driverId);
      setVehicleDriverRows(nextAssignments);
      saveVehicleDrivers(nextAssignments);
    }

    setForm(blank(vehicleTypeOptions[0] || 'E-Bike'));
    setShowAdd(false);
  };

  const openAllocation = () => {
    setAllocationForm({ location: 'Unassigned', org: '' });
    setShowAllocate(true);
  };

  const handleAllocation = () => {
    const targetIds = selected.length ? selected : visibleFull.map((row) => row.id);
    if (!targetIds.length) return;
    const nextLocation = allocationForm.location || 'Unassigned';
    const nextOrg = allocationForm.org.trim();
    const nextLocationPin = LOCATION_COORDINATES[nextLocation] || '20.5937,78.9629';

    setRows((current) => current.map((row) => (
      targetIds.includes(row.id)
        ? { ...row, location: nextLocation, locationPin: nextLocationPin, org: nextOrg || row.org || 'Global Pool' }
        : row
    )));
    setShowAllocate(false);
  };

  const openImportQr = () => {
    setQrImportPrefix('QR-55');
    setShowQrImportModal(true);
  };

  const openQrAutoAllocate = () => {
    setScanQrInput('');
    setScanDriverId('');
    setScanStationScopeId('');
    setShowQrAutoAllocateModal(true);
  };

  const handleQrAutoAllocate = () => {
    if (!scannedVehicle) {
      window.alert('Scan a valid vehicle QR or enter a valid vehicle ID.');
      return;
    }

    const today = todayKey();
    if (scannedVehicleMeta.driverApplicable) {
      if (!scanDriverId) {
        window.alert('Select a driver for bus/buggy allocation.');
        return;
      }

      const assignedVehicleId = getAssignedVehicleIdForDriver(vehicleDriverRows, scanDriverId, today);
      if (assignedVehicleId && assignedVehicleId !== scannedVehicle.id) {
        window.alert('Selected driver is already allocated for another vehicle today.');
        return;
      }

      const nextAssignments = upsertVehicleDriverAssignment(vehicleDriverRows, scannedVehicle.id, scanDriverId, today);
      setVehicleDriverRows(nextAssignments);
      saveVehicleDrivers(nextAssignments);
      window.alert('Driver allocated for today from QR scan.');
      setShowQrAutoAllocateModal(false);
      return;
    }

    if (!selectedStation) {
      window.alert('Select a station for cycle/bike allocation.');
      return;
    }

    setRows((current) => current.map((row) => (
      row.id === scannedVehicle.id
        ? {
            ...row,
            location: selectedStation.locationName,
            locationPin: selectedStation.locationPin || row.locationPin,
          }
        : row
    )));

    window.alert('Cycle/bike allocated station-wise from QR scan.');
    setShowQrAutoAllocateModal(false);
  };

  const handleImportQr = () => {
    const targetIds = selected.length ? selected : visibleFull.map((row) => row.id);
    const prefix = qrImportPrefix.trim();
    if (!prefix || !targetIds.length) return;
    let counter = 1;
    setRows((current) => current.map((row) => (
      targetIds.includes(row.id)
        ? { ...row, qr: `${prefix}${String(counter++).padStart(2, '0')}` }
        : row
    )));
    setShowQrImportModal(false);
  };

  const handleLiveMovement = () => {
    setRows((current) => [...current].sort((a, b) => Number(b.status === 'Active') - Number(a.status === 'Active')));
  };

  const toggleSelectedLocks = (locked) => {
    setRows((current) => current.map((row) => (selected.includes(row.id) ? { ...row, locked } : row)));
  };

  const handleQrView = (row) => {
    setQrPreview({ id: row.id, qr: row.qr });
    setShowQrViewModal(true);
  };

  const handleVehicleDetail = (row) => {
    setDetailVehicle(row);
    setShowDetailModal(true);
  };

  const handleDownloadBulkQr = async () => {
    const sourceRows = selected.length ? rows.filter((row) => selected.includes(row.id)) : visibleFull;
    if (!sourceRows.length) {
      window.alert('Select vehicles or apply filters before downloading bulk QR codes.');
      return;
    }

    setIsBulkQrDownloading(true);
    try {
      const [{ jsPDF }, { default: QRCodeGenerator }] = await Promise.all([
        import('jspdf'),
        import('qrcode'),
      ]);
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 32;
      const gap = 14;
      const cols = 2;
      const cardWidth = (pageWidth - margin * 2 - gap * (cols - 1)) / cols;
      const cardHeight = 190;
      const qrSize = 112;

      let y = margin;
      for (let i = 0; i < sourceRows.length; i += 1) {
        const col = i % cols;
        if (i > 0 && col === 0) {
          y += cardHeight + gap;
          if (y + cardHeight > pageHeight - margin) {
            doc.addPage();
            y = margin;
          }
        }

        const row = sourceRows[i];
        const x = margin + col * (cardWidth + gap);
        const qrDataUrl = await QRCodeGenerator.toDataURL(row.qr, { width: 256, margin: 1 });

        doc.setDrawColor(22, 36, 49);
        doc.roundedRect(x, y, cardWidth, cardHeight, 10, 10);
        doc.addImage(qrDataUrl, 'PNG', x + (cardWidth - qrSize) / 2, y + 12, qrSize, qrSize);

        doc.setFontSize(11);
        doc.setTextColor(22, 36, 49);
        doc.text(`Vehicle No: ${row.id}`, x + 12, y + 145);
        doc.text(`QR Value: ${row.qr}`, x + 12, y + 162);
        doc.text(`Type: ${row.type}`, x + 12, y + 178);
      }

      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      doc.save(`vehicle-qr-codes-${stamp}.pdf`);
    } catch (error) {
      window.alert('Unable to generate bulk QR PDF right now. Please try again.');
    } finally {
      setIsBulkQrDownloading(false);
    }
  };

  const downloadExcelTemplate = () => {
    import('xlsx').then((XLSX) => {
      const template = [
        ['vehicleId', 'qrCode', 'type', 'businessType', 'organization', 'location', 'status', 'locked'],
        ['VH-201', 'QR-5201', 'E-Bike', 'University', 'North Campus', 'New Delhi Campus Loop', 'Active', 'false'],
        ['VH-202', 'QR-5202', 'Cycle', 'General', 'Global Pool', 'Unassigned', 'Offline', 'true'],
      ];
      const ws = XLSX.utils.aoa_to_sheet(template);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Vehicles');
      XLSX.writeFile(wb, 'vehicle-bulk-template.xlsx');
    }).catch(() => {
      window.alert('Unable to prepare the Excel template right now. Please try again.');
    });
  };

  const handleBulkExcelImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const XLSX = await import('xlsx');
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const sheetRows = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });

      if (!sheetRows.length) {
        window.alert('The selected Excel file is empty.');
        return;
      }

      setBulkFileName(file.name);
      setBulkPreviewCount(sheetRows.length);

      const existingIds = new Set(rows.map((row) => row.id));
      const existingQrs = new Set(rows.map((row) => row.qr));
      let nextVehicleSequence = getNextVehicleSequence(rows);
      let nextQrSequence = getNextQrSequence(rows);
      let skipped = 0;

      const importedRows = sheetRows.reduce((acc, raw) => {
        const type = String(pickCell(raw, ['type', 'vehicleType']) || '').trim() || vehicleTypeOptions[0] || 'E-Bike';
        const statusRaw = String(pickCell(raw, ['status']) || '').trim();
        const status = VALID_STATUSES.has(statusRaw) ? statusRaw : 'Active';

        let id = String(pickCell(raw, ['vehicleId', 'id', 'vehicleNumber']) || '').trim();
        if (!id) {
          id = `VH-${String(nextVehicleSequence++).padStart(3, '0')}`;
        }

        if (existingIds.has(id)) {
          skipped += 1;
          return acc;
        }

        let qr = String(pickCell(raw, ['qrCode', 'qr', 'qrId']) || '').trim();
        if (!qr) {
          qr = `QR-${nextQrSequence++}`;
        }

        if (existingQrs.has(qr)) {
          skipped += 1;
          return acc;
        }

        const location = String(pickCell(raw, ['location']) || '').trim() || 'Unassigned';
        const locationPinRaw = String(pickCell(raw, ['locationPin', 'coordinates']) || '').trim();
        const locationPin = locationPinRaw || LOCATION_COORDINATES[location] || '20.5937,78.9629';
        const meta = vehicleTypeCatalog[type] || { seatCount: 1, driverApplicable: false };

        const newRow = {
          id,
          qr,
          type,
          seats: Number(meta.seatCount) || 1,
          driverApplicable: Boolean(meta.driverApplicable),
          biz: String(pickCell(raw, ['businessType', 'business', 'biz']) || '').trim() || 'General',
          org: String(pickCell(raw, ['organization', 'org']) || '').trim() || 'Global Pool',
          location,
          locationPin,
          status,
          locked: parseBool(pickCell(raw, ['locked', 'lockState'])),
        };

        existingIds.add(id);
        existingQrs.add(qr);
        acc.push(newRow);
        return acc;
      }, []);

      if (!importedRows.length) {
        window.alert('No vehicles were imported. Check duplicate IDs or QR values.');
        return;
      }

      setRows((prev) => [...prev, ...importedRows]);
      setShowBulkUploadModal(false);
      window.alert(`Imported ${importedRows.length} vehicles${skipped ? `, skipped ${skipped}` : ''}.`);
      event.target.value = '';
    } catch (error) {
      window.alert('Unable to parse this Excel file. Please use the template and try again.');
    }
  };

  const handleDeleteSelected = async () => {
    if (!window.confirm(`Delete ${selected.length} vehicles?`)) return;
    const deletingIds = [...selected];
    if (usingApi) {
      try {
        await Promise.all(deletingIds.map((id) => deleteVehicle(id)));
      } catch (error) {
        reportVehiclesApiError('Bulk delete vehicles', error);
      }
    }
    setRows((prev) => prev.filter((r) => !deletingIds.includes(r.id)));
    setSelected([]);
  };

  useEffect(() => {
    saveFleetRows(rows);
  }, [rows]);

  useEffect(() => {
    if (!usingApi) return;
    let mounted = true;

    const hydrateVehicles = async () => {
      setIsVehiclesLoading(true);
      setVehiclesSyncError('');
      try {
        const remoteRows = await listVehicles({ page: 1, limit: 500 });
        if (!mounted) return;
        if (Array.isArray(remoteRows) && remoteRows.length) {
          setRows(remoteRows);
          setVehiclesMode('API');
        } else {
          setVehiclesMode('Local');
        }
      } catch (error) {
        if (!mounted) return;
        setVehiclesMode('Local');
        setVehiclesSyncError(error?.message || 'Unable to sync vehicles from backend.');
      } finally {
        if (mounted) setIsVehiclesLoading(false);
      }
    };

    hydrateVehicles();
    return () => {
      mounted = false;
    };
  }, [usingApi]);

  useEffect(() => {
    const reloadSetup = () => setBusinessSetup(loadBusinessSetup());
    window.addEventListener(BUSINESS_SETUP_UPDATED_EVENT, reloadSetup);
    return () => window.removeEventListener(BUSINESS_SETUP_UPDATED_EVENT, reloadSetup);
  }, []);

  useEffect(() => {
    const syncAssignments = () => {
      setStaffRows(loadOperationalStaff([]));
      setVehicleDriverRows(loadVehicleDrivers([]));
      setLocationRows(loadOperationalLocations([]));
    };

    window.addEventListener(STAFF_UPDATED_EVENT, syncAssignments);
    window.addEventListener(VEHICLE_DRIVERS_UPDATED_EVENT, syncAssignments);
    window.addEventListener('mos:operations-locations-updated', syncAssignments);

    return () => {
      window.removeEventListener(STAFF_UPDATED_EVENT, syncAssignments);
      window.removeEventListener(VEHICLE_DRIVERS_UPDATED_EVENT, syncAssignments);
      window.removeEventListener('mos:operations-locations-updated', syncAssignments);
    };
  }, []);

  useEffect(() => {
    setForm((prev) => (vehicleTypeOptions.includes(prev.type) ? prev : { ...blank(vehicleTypeOptions[0] || 'E-Bike'), mode: prev.mode }));
  }, [vehicleTypeOptions]);

  return (
    <section className="page active space-y-5" id="page-vehicles">
      <div className="page-hero ph-vehicles">
        <div className="page-hero-left">
          <div className="page-hero-icon"><i className="fa fa-bicycle"></i></div>
          <div className="page-hero-text">
            <h1>Vehicles</h1>
            <p>Create vehicles, upload from Excel, manage allocations, and export printable QR packs.</p>
          </div>
        </div>
        <div className="page-hero-right">
          <div className="page-hero-chips">
            <span className="page-hero-chip"><i className="fa fa-bicycle"></i> {visibleFull.length} Visible</span>
            <span className="page-hero-chip"><i className="fa fa-circle-check"></i> {activeCount} Active</span>
            <span className="page-hero-chip"><i className="fa fa-lock"></i> {lockedCount} Locked</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn-primary" onClick={() => openCreateModal('single')}><i className="fa fa-plus"></i> Add Vehicle</button>
            <button className="btn-outline" onClick={() => setShowBulkUploadModal(true)}><i className="fa fa-file-excel"></i> Bulk Upload Excel</button>
            <button className="btn-outline" onClick={handleDownloadBulkQr} disabled={isBulkQrDownloading}>
              <i className="fa fa-download"></i> {isBulkQrDownloading ? 'Preparing QR PDF...' : 'Download Bulk QR'}
            </button>
          </div>
        </div>
      </div>

      <div className="table-card full" style={{ padding: '8px 12px' }}>
        <div className="flex flex-wrap items-center justify-between gap-2 text-[12px]">
          <span className={`badge-pill ${vehiclesMode === 'API' ? '' : 'bg-amber-500/20 text-amber-300'}`}>
            <i className={`fa ${vehiclesMode === 'API' ? 'fa-plug-circle-check' : 'fa-database'}`}></i>&nbsp;
            Vehicles Mode: {vehiclesMode}
          </span>
          {isVehiclesLoading ? <span className="text-[11px] opacity-80">Syncing vehicles from backend...</span> : null}
          {vehiclesSyncError ? <span className="text-[11px] text-rose-300">{vehiclesSyncError}</span> : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="kpi-card"><div className="kpi-icon blue"><i className="fa fa-bicycle"></i></div><div className="kpi-info"><span className="kpi-label">Total</span><span className="kpi-value">{rows.length}</span></div></div>
        <div className="kpi-card"><div className="kpi-icon gold"><i className="fa fa-circle-check"></i></div><div className="kpi-info"><span className="kpi-label">Active</span><span className="kpi-value">{activeCount}</span></div></div>
        <div className="kpi-card"><div className="kpi-icon red"><i className="fa fa-circle-xmark"></i></div><div className="kpi-info"><span className="kpi-label">Offline</span><span className="kpi-value">{offlineCount}</span></div></div>
        <div className="kpi-card"><div className="kpi-icon green"><i className="fa fa-wrench"></i></div><div className="kpi-info"><span className="kpi-label">Maintenance</span><span className="kpi-value">{maintenanceCount}</span></div></div>
        <div className="kpi-card"><div className="kpi-icon blue"><i className="fa fa-lock"></i></div><div className="kpi-info"><span className="kpi-label">Locked</span><span className="kpi-value">{lockedCount}</span></div></div>
      </div>

      <div className="fleet-grid">
        {visibleFull.slice(0, 6).map((v) => (
          <div className="fleet-card rounded-2xl p-4 md:p-5" key={`fleet-${v.id}`}>
            <div className="fleet-card-status">
              <span className={`fleet-status-${v.status === 'Active' ? 'active' : v.status === 'Offline' ? 'offline' : 'maint'}`}>{v.status}</span>
            </div>
            <div className="fleet-type-icon"><i className={`fa ${v.type.includes('Bus') ? 'fa-bus' : v.type.includes('Buggy') ? 'fa-shuttle-space' : v.type.includes('E-Bike') ? 'fa-bolt' : 'fa-bicycle'}`}></i></div>
            <button type="button" className="fleet-id cursor-pointer text-left text-teal-400 hover:underline" onClick={() => handleVehicleDetail(v)}>{v.id}</button>
            <div className="fleet-org text-xs">{v.type} • {v.org} • {v.location || 'Unassigned'}</div>
            <div className="fleet-actions flex items-center gap-2">
              <button className="btn-outline" onClick={() => toggleLock(v.id)}><i className={`fa fa-${v.locked ? 'lock-open' : 'lock'}`}></i> {v.locked ? 'Unlock' : 'Lock'}</button>
              <button className="act-btn" title="QR View" onClick={() => handleQrView(v)}><i className="fa fa-qrcode"></i></button>
              <button className="act-btn red" title="Delete" onClick={() => deleteRow(v.id)}><i className="fa fa-trash"></i></button>
            </div>
          </div>
        ))}
      </div>

      <div className="toolbar">
        <div className="toolbar-left">
          <button className="btn-outline" onClick={openAllocation}><i className="fa fa-layer-group"></i> Allocation</button>
          <button className="btn-outline" onClick={openQrAutoAllocate}><i className="fa fa-qrcode"></i> QR Auto Allocate</button>
          <button className="btn-outline" onClick={openImportQr}><i className="fa fa-qrcode"></i> Import QR Prefix</button>
          <button className="btn-outline" onClick={() => openCreateModal('multi')}><i className="fa fa-copy"></i> Create Multi</button>
          <button className="btn-outline" onClick={handleLiveMovement}><i className="fa fa-location-dot"></i> Live Movement Sort</button>
        </div>
        <div className="toolbar-right">
          <button className={`btn-outline${fp.anyFiltered ? ' filter-btn-active' : ''}`} onClick={() => fp.setOpen(true)}>
            <i className="fa fa-filter"></i> Filter{fp.anyFiltered ? ` (${fp.filterCount})` : ''}
          </button>
        </div>
      </div>

      {selected.length > 0 && (
        <div className="toolbar toolbar-selection">
          <span className="toolbar-selection-count">{selected.length} selected</span>
          <div className="toolbar-left">
            <button className="btn-outline" onClick={() => toggleSelectedLocks(true)}><i className="fa fa-lock"></i> Lock</button>
            <button className="btn-outline" onClick={() => toggleSelectedLocks(false)}><i className="fa fa-lock-open"></i> Unlock</button>
            <button className="btn-outline" onClick={handleDownloadBulkQr}><i className="fa fa-download"></i> Download QR</button>
            <button className="btn-outline btn-outline-danger" onClick={handleDeleteSelected}>
              <i className="fa fa-trash"></i> Delete Selected
            </button>
          </div>
        </div>
      )}

      <div className="table-card full">
        <div className="table-wrap overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th><input type="checkbox" checked={allChecked} onChange={(e) => toggleAll(e.target.checked)} /></th>
                <th>#</th>
                <th>Vehicle ID</th>
                <th>QR ID</th>
                <th>Type</th>
                <th>Seats</th>
                <th>Driver</th>
                <th>Assigned Driver</th>
                <th>Business Type</th>
                <th>Organization</th>
                <th>Location</th>
                <th>Status</th>
                <th>Lock</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleFull.map((row, i) => (
                <tr key={row.id}>
                  <td><input type="checkbox" checked={selected.includes(row.id)} onChange={(e) => toggleRow(row.id, e.target.checked)} /></td>
                  <td>{i + 1}</td>
                  <td><button type="button" className="mono text-teal-400 hover:underline" onClick={() => handleVehicleDetail(row)}>{row.id}</button></td>
                  <td><span className="mono">{row.qr}</span></td>
                  <td>{row.type}</td>
                  <td>{vehicleTypeCatalog[row.type]?.seatCount || row.seats || 1}</td>
                  <td><span className={`status ${(vehicleTypeCatalog[row.type]?.driverApplicable || row.driverApplicable) ? 'processing' : 'pending'}`}>{(vehicleTypeCatalog[row.type]?.driverApplicable || row.driverApplicable) ? 'Driver' : 'Self Ride'}</span></td>
                  <td>{enrichedRows.find((entry) => entry.id === row.id)?.assignedDriverName || 'Unassigned'}</td>
                  <td>{row.biz}</td>
                  <td>{row.org}</td>
                  <td>{row.location || 'Unassigned'}</td>
                  <td><span className={`status ${STATUS_CLASS[row.status]}`}>{row.status}</span></td>
                  <td>
                    <button className={`status status-toggle-btn ${row.locked ? 'cancelled' : 'completed'}`} onClick={() => toggleLock(row.id)}>
                      <i className={`fa fa-${row.locked ? 'lock' : 'lock-open'}`}></i> {row.locked ? 'Locked' : 'Unlocked'}
                    </button>
                  </td>
                  <td className="actions">
                    <button className="act-btn" title="Edit" onClick={() => openEditVehicle(row)}><i className="fa fa-pen"></i></button>
                    <button className="act-btn" title="QR View" onClick={() => handleQrView(row)}><i className="fa fa-qrcode"></i></button>
                    <button className="act-btn red" title="Delete" onClick={() => deleteRow(row.id)}><i className="fa fa-trash"></i></button>
                  </td>
                </tr>
              ))}
              {!visibleFull.length && (
                <tr>
                  <td colSpan={14} style={{ textAlign: 'center', color: 'var(--text-2)' }}>No vehicles found for selected filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <FilterPanel hook={fp} columns={COLUMNS} data={flat} />

      <Modal
        open={showAdd}
        title={editingVehicleId ? 'Edit Vehicle' : 'Create Vehicles'}
        onClose={() => { setShowAdd(false); setEditingVehicleId(null); }}
        footer={<><button className="btn-outline" onClick={() => { setShowAdd(false); setEditingVehicleId(null); }}>Cancel</button><button className="btn-primary" onClick={handleCreate}>{editingVehicleId ? 'Save Vehicle' : 'Create'}</button></>}
      >
        <div className="form-grid">
          <div className="form-field"><label>Vehicle Type</label>
            <select className="setting-input" value={form.type} onChange={f('type')}>
              {vehicleTypeOptions.map((vehicleType) => <option key={vehicleType}>{vehicleType}</option>)}
            </select>
          </div>
          <div className="form-field"><label>Creation Mode</label>
            <select className="setting-input" value={form.mode} onChange={f('mode')}>
              <option value="single">Single</option>
              <option value="multi">Multi</option>
            </select>
          </div>
          <div className="form-field"><label>ID Prefix</label><input className="setting-input" value={form.prefix} onChange={f('prefix')} placeholder="VH-" /></div>
          {form.mode === 'multi' && (
            <div className="form-field"><label>Count (max 50)</label><input type="number" className="setting-input" min={1} max={50} value={form.count} onChange={f('count')} /></div>
          )}
          <div className="form-field"><label>Business Type</label>
            <select className="setting-input" value={form.biz} onChange={f('biz')}>
              <option value="">Any</option>
              {activeBusinessTypes.map((businessType) => <option key={businessType.id} value={businessType.name}>{businessType.name}</option>)}
            </select>
          </div>
          <div className="form-field"><label>Seats</label><input className="setting-input" value={selectedTypeMeta.seatCount || 1} readOnly /></div>
          <div className="form-field"><label>Driver Applicable</label><input className="setting-input" value={selectedTypeMeta.driverApplicable ? 'Yes' : 'No'} readOnly /></div>
          {selectedTypeMeta.driverApplicable && (
            <div className="form-field"><label>Assign Driver</label>
              <select className="setting-input" value={form.driverId || ''} onChange={f('driverId')}>
                <option value="">Unassigned</option>
                {activeDrivers
                  .filter((driver) => {
                    const assignedVehicleId = getAssignedVehicleIdForDriver(vehicleDriverRows, driver.id);
                    return !assignedVehicleId || assignedVehicleId === editingVehicleId;
                  })
                  .map((driver) => <option key={driver.id} value={driver.id}>{driver.name} ({driver.staff_id})</option>)}
              </select>
            </div>
          )}
          <div className="form-field"><label>Organization</label>
            <select className="setting-input" value={form.org} onChange={f('org')}>
              <option value="">Any</option>
              <option>Global Pool</option>
              <option>North Campus</option>
              <option>South Campus</option>
              <option>Tech Park Tower</option>
              <option>City Public Mobility</option>
            </select>
          </div>
          <div className="form-field"><label>Location</label>
            <select className="setting-input" value={form.location} onChange={f('location')}>
              {LOCATION_OPTIONS.map((location) => <option key={location}>{location}</option>)}
            </select>
          </div>
          <div className="form-field"><label>Status</label>
            <select className="setting-input" value={form.status} onChange={f('status')}>
              <option>Active</option>
              <option>Offline</option>
              <option>Maintenance</option>
            </select>
          </div>
          <div className="form-field"><label>Lock State</label>
            <select className="setting-input" value={form.locked} onChange={f('locked')}>
              <option value="unlocked">Unlocked</option>
              <option value="locked">Locked</option>
            </select>
          </div>
        </div>
      </Modal>

      <Modal
        open={showAllocate}
        title="Allocate Vehicles"
        onClose={() => setShowAllocate(false)}
        footer={<><button className="btn-outline" onClick={() => setShowAllocate(false)}>Cancel</button><button className="btn-primary" onClick={handleAllocation}>Apply Allocation</button></>}
      >
        <div className="form-grid">
          <div className="form-field"><label>Target Scope</label><input className="setting-input" value={selected.length ? `${selected.length} selected vehicle(s)` : `${visibleFull.length} visible vehicle(s)`} readOnly /></div>
          <div className="form-field"><label>Location</label>
            <select className="setting-input" value={allocationForm.location} onChange={(e) => setAllocationForm((prev) => ({ ...prev, location: e.target.value }))}>
              {LOCATION_OPTIONS.map((location) => <option key={location}>{location}</option>)}
            </select>
          </div>
          <div className="form-field full"><label>Organization (Optional)</label><input className="setting-input" value={allocationForm.org} onChange={(e) => setAllocationForm((prev) => ({ ...prev, org: e.target.value }))} placeholder="Keep empty to retain existing organization" /></div>
        </div>
      </Modal>

      <Modal
        open={showQrImportModal}
        title="Import QR Prefix"
        onClose={() => setShowQrImportModal(false)}
        footer={<><button className="btn-outline" onClick={() => setShowQrImportModal(false)}>Cancel</button><button className="btn-primary" onClick={handleImportQr} disabled={!qrImportPrefix.trim()}>Apply</button></>}
      >
        <div className="form-grid">
          <div className="form-field"><label>Target Scope</label><input className="setting-input" value={selected.length ? `${selected.length} selected vehicle(s)` : `${visibleFull.length} visible vehicle(s)`} readOnly /></div>
          <div className="form-field"><label>QR Prefix</label><input className="setting-input" value={qrImportPrefix} onChange={(e) => setQrImportPrefix(e.target.value)} placeholder="QR-55" /></div>
        </div>
      </Modal>

      <Modal
        open={showQrAutoAllocateModal}
        title="QR Auto Allocation"
        onClose={() => setShowQrAutoAllocateModal(false)}
        size="lg"
        footer={<><button className="btn-outline" onClick={() => setShowQrAutoAllocateModal(false)}>Cancel</button><button className="btn-primary" onClick={handleQrAutoAllocate}>Allocate for Today</button></>}
      >
        <div className="form-grid">
          <div className="form-field full">
            <label>Scan QR / Vehicle ID</label>
            <input
              className="setting-input"
              value={scanQrInput}
              onChange={(e) => setScanQrInput(e.target.value)}
              placeholder="Scan QR code value (example: QR-4422)"
            />
          </div>

          <div className="form-field full">
            <label>Matched Vehicle</label>
            <input
              className="setting-input"
              value={scannedVehicle ? `${scannedVehicle.id} • ${scannedVehicle.type} • ${scannedVehicle.location || 'Unassigned'}` : 'No vehicle matched'}
              readOnly
            />
          </div>

          {scannedVehicle && scannedVehicleMeta.driverApplicable && (
            <div className="form-field full">
              <label>Assign Driver (Bus/Buggy) - Today</label>
              <select className="setting-input" value={scanDriverId} onChange={(e) => setScanDriverId(e.target.value)}>
                <option value="">Select driver</option>
                {activeDrivers
                  .filter((driver) => {
                    const assignedVehicleId = getAssignedVehicleIdForDriver(vehicleDriverRows, driver.id, todayKey());
                    return !assignedVehicleId || assignedVehicleId === scannedVehicle.id;
                  })
                  .map((driver) => (
                    <option key={driver.id} value={driver.id}>{driver.name} ({driver.staff_id})</option>
                  ))}
              </select>
            </div>
          )}

          {scannedVehicle && !scannedVehicleMeta.driverApplicable && (
            <div className="form-field full">
              <label>Allocate Station (Cycle/Bike)</label>
              <select className="setting-input" value={scanStationScopeId} onChange={(e) => setScanStationScopeId(e.target.value)}>
                <option value="">Select station</option>
                {stationOptions.map((station) => (
                  <option key={station.scopeId} value={station.scopeId}>{station.stationName} - {station.locationName}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </Modal>

      <Modal
        open={showBulkUploadModal}
        title="Bulk Create Vehicles via Excel"
        onClose={() => setShowBulkUploadModal(false)}
        footer={<><button className="btn-outline" onClick={() => setShowBulkUploadModal(false)}>Close</button><button className="btn-primary" onClick={downloadExcelTemplate}>Download Template</button></>}
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-300">Upload an .xlsx, .xls, or .csv file. Supported columns: vehicleId, qrCode, type, businessType, organization, location, status, locked.</p>
          <div className="form-field full">
            <label>Select Excel File</label>
            <input className="setting-input" type="file" accept=".xlsx,.xls,.csv" onChange={handleBulkExcelImport} />
          </div>
          {bulkFileName ? (
            <div className="rounded-lg border border-slate-700/80 bg-slate-900/70 p-3 text-sm text-slate-300">
              File: {bulkFileName} • Rows Detected: {bulkPreviewCount}
            </div>
          ) : null}
        </div>
      </Modal>

      <Modal
        open={showQrViewModal}
        title={`QR Code • ${qrPreview.id}`}
        onClose={() => setShowQrViewModal(false)}
        footer={<button className="btn-outline" onClick={() => setShowQrViewModal(false)}>Close</button>}
      >
        <div className="flex flex-col items-center justify-center gap-4 py-4">
          <div className="rounded-lg bg-white p-4">
            <Suspense fallback={<div className="flex h-[256px] w-[256px] items-center justify-center text-sm text-slate-500">Loading QR preview...</div>}>
              <QRCode value={qrPreview.qr} size={256} level="H" includeMargin={true} />
            </Suspense>
          </div>
          <div className="text-center">
            <div className="text-sm text-slate-400">Vehicle Number</div>
            <div className="font-mono text-base font-semibold">{qrPreview.id}</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-slate-400">QR Code Value</div>
            <div className="font-mono text-sm">{qrPreview.qr}</div>
          </div>
        </div>
      </Modal>

      <Modal
        open={showDetailModal}
        title={`Vehicle Details • ${detailVehicle?.id}`}
        onClose={() => setShowDetailModal(false)}
        footer={<><button className="btn-outline" onClick={() => openEditVehicle(detailVehicle)}>Edit</button><button className="btn-outline" onClick={() => setShowDetailModal(false)}>Close</button></>}
      >
        {detailVehicle ? (
          <div className="space-y-4">
            <div className="form-grid">
              <div className="form-field"><label>Vehicle ID</label><input className="setting-input mono" value={detailVehicle.id} readOnly /></div>
              <div className="form-field"><label>QR Code</label><input className="setting-input mono" value={detailVehicle.qr} readOnly /></div>
              <div className="form-field"><label>Vehicle Type</label><input className="setting-input" value={detailVehicle.type} readOnly /></div>
              <div className="form-field"><label>Seats</label><input className="setting-input" value={vehicleTypeCatalog[detailVehicle.type]?.seatCount || detailVehicle.seats || 1} readOnly /></div>
              <div className="form-field"><label>Driver Applicable</label><input className="setting-input" value={vehicleTypeCatalog[detailVehicle.type]?.driverApplicable ? 'Yes' : 'No'} readOnly /></div>
              <div className="form-field"><label>Assigned Driver</label><input className="setting-input" value={enrichedRows.find((row) => row.id === detailVehicle.id)?.assignedDriverName || 'Unassigned'} readOnly /></div>
              <div className="form-field"><label>Business Type</label><input className="setting-input" value={detailVehicle.biz} readOnly /></div>
              <div className="form-field"><label>Organization</label><input className="setting-input" value={detailVehicle.org} readOnly /></div>
              <div className="form-field"><label>Location</label><input className="setting-input" value={detailVehicle.location || 'Unassigned'} readOnly /></div>
              <div className="form-field"><label>Status</label><input className="setting-input" value={detailVehicle.status} readOnly /></div>
              <div className="form-field"><label>Lock State</label><input className="setting-input" value={detailVehicle.locked ? 'Locked' : 'Unlocked'} readOnly /></div>
            </div>
            <div className="form-field full">
              <label>Live Location</label>
              <div className="overflow-hidden rounded-lg border border-slate-700">
                <Suspense fallback={<div className="flex h-[300px] items-center justify-center bg-slate-950/20 text-sm text-slate-400">Loading map...</div>}>
                  <StationMap
                    stations={[{
                      id: detailVehicle.id,
                      name: `${detailVehicle.type} • ${detailVehicle.org}`,
                      locationPin: detailVehicle.locationPin || LOCATION_COORDINATES[detailVehicle.location] || '20.5937,78.9629',
                      status: detailVehicle.status,
                      city: detailVehicle.location,
                    }]}
                    height="300px"
                  />
                </Suspense>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </section>
  );
}

