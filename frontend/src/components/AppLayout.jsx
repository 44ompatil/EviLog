import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import Header from "./Header";
import Sidebar from "./Sidebar";
import RegisterCaseOverlay from "./overlays/RegisterCaseOverlay";
import RegisterEvidenceOverlay from "./overlays/RegisterEvidenceOverlay";
import AssignRfidOverlay from "./overlays/AssignRfidOverlay";
import OfficerRegistrationOverlay from "./overlays/OfficerRegistrationOverlay";
import { sidebarItems } from "../data/dashboardData";
import Dashboard from "../screens/Dashboard/Dashboard";
import Cases from "../screens/Cases/Cases";
import Evidence from "../screens/Evidence/Evidence";
import Officers from "../screens/Officers/Officers";
import SecurityAlerts from "../screens/SecurityAlerts/SecurityAlerts";
import Settings from "../screens/Settings/Settings";
import { casesApi } from "../services/cases";
import { evidenceApi } from "../services/evidence";
import { officersApi } from "../services/officers";
import { rfidApi } from "../services/rfid";
import { alertsApi } from "../services/alerts";
import { healthApi } from "../services/api";
import {
  toApiStatus,
  mapCase,
  mapEvidence,
  mapOfficer,
  mapAlert,
  mapActivity,
  currentRfidAssignments,
} from "../services/adapters";

const screenMeta = {
  "/dashboard": {
    title: "Dashboard",
    subtitle: "Overview of evidence and station activity",
  },
  "/cases": {
    title: "Cases",
    subtitle: "Manage registered cases and FIR records",
  },
  "/evidence": {
    title: "Evidence",
    subtitle: "Browse and manage evidence items",
  },
  "/officers": {
    title: "Officers",
    subtitle: "Registered officers and duty records",
  },
  "/security-alerts": {
    title: "Security Alerts",
    subtitle: "Monitor live station security activity",
  },
  "/settings": {
    title: "Settings",
    subtitle: "System configuration and preferences",
  },
};

const asCaseRequest = (record) => ({
  fir_number: record.firNumber.trim(),
  case_title: record.title.trim(),
  description:
    record.description?.trim() || "No additional case description provided.",
  case_type: toApiStatus(record.caseType),
  status: toApiStatus(record.status),
});

const asEvidenceRequest = (record) => ({
  case_id: record.caseId,
  evidence_name: record.name.trim(),
  evidence_type: toApiStatus(record.type),
  description:
    record.description?.trim() ||
    "No additional evidence description provided.",
  status: toApiStatus(record.status),
});

const asOfficerRequest = (record) => ({
  name: record.name.trim(),
  badge_number: record.badgeNumber.trim(),
  role: record.role,
  status: toApiStatus(record.status),
});

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath =
    location.pathname === "/" ? "/dashboard" : location.pathname;
  const meta = screenMeta[currentPath] || screenMeta["/dashboard"];
  const [cases, setCases] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [rfidTags, setRfidTags] = useState([]);
  const [securityAlerts, setSecurityAlerts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [rfidMappings, setRfidMappings] = useState([]);
  const [detailSignal, setDetailSignal] = useState(null);
  const detailSignalSequence = useRef(0);
  const evidenceRecordsRef = useRef([]);
  const [loading, setLoading] = useState(true);
  const [backendStatus, setBackendStatus] = useState("checking");
  const [errorMessage, setErrorMessage] = useState("");
  const [registerEvidenceOpen, setRegisterEvidenceOpen] = useState(false);
  const [assignRfidOpen, setAssignRfidOpen] = useState(false);
  const [registerCaseOpen, setRegisterCaseOpen] = useState(false);
  const [registerOfficerOpen, setRegisterOfficerOpen] = useState(false);
  const [dashboardOfficerOverlayOpen, setDashboardOfficerOverlayOpen] =
    useState(false);

  const refreshData = useCallback(async ({ initial = false } = {}) => {
    if (initial) setLoading(true);
    try {
      const results = await Promise.allSettled([
        healthApi.check(),
        casesApi.list(),
        evidenceApi.list(),
        officersApi.list(),
        rfidApi.list(),
        rfidApi.mappings(),
        alertsApi.list(),
        alertsApi.transactions(),
      ]);
      const [
        healthResult,
        caseResult,
        evidenceResult,
        officerResult,
        tagResult,
        mappingResult,
        alertResult,
        transactionResult,
      ] = results;
      const health =
        healthResult.status === "fulfilled"
          ? healthResult.value
          : { reachable: false, healthy: false };
      setBackendStatus(health.reachable ? "online" : "offline");

      const successful = (result) =>
        result.status === "fulfilled" ? result.value : null;
      const caseRecords = successful(caseResult);
      const evidenceRecords = successful(evidenceResult);
      const officerRecords = successful(officerResult);
      const tagRecords = successful(tagResult);
      const mappings = successful(mappingResult);
      const alertRecords = successful(alertResult);
      const transactionRecords = successful(transactionResult);
      const failures = results
        .slice(1)
        .flatMap((result, index) =>
          result.status === "rejected"
            ? [
                {
                  name: [
                    "Cases",
                    "Evidence",
                    "Officers",
                    "RFID tags",
                    "RFID mappings",
                    "Security alerts",
                    "Transactions",
                  ][index],
                  error: result.reason,
                },
              ]
            : [],
        );

      if (evidenceRecords) {
        evidenceRecordsRef.current = evidenceRecords;
        const custodyResults = await Promise.allSettled(
          evidenceRecords.map((record) =>
            evidenceApi.getCustody(record.evidence_id),
          ),
        );
        const custodyLists = custodyResults.map((result, index) => {
          if (result.status === "fulfilled") return result.value;
          failures.push({
            name: `Custody history for ${evidenceRecords[index].evidence_id}`,
            error: result.reason,
          });
          return [];
        });
        const assignments = currentRfidAssignments(
          tagRecords || [],
          mappings || [],
        );
        setEvidence(
          evidenceRecords.map((record, index) =>
            mapEvidence(record, assignments, custodyLists[index]),
          ),
        );
      }
      if (caseRecords)
        setCases(
          caseRecords.map((record) =>
            mapCase(record, evidenceRecords || evidenceRecordsRef.current),
          ),
        );
      if (officerRecords) setOfficers(officerRecords.map(mapOfficer));
      if (tagRecords) setRfidTags(tagRecords);
      if (mappings) setRfidMappings(mappings);
      if (alertRecords) setSecurityAlerts(alertRecords.map(mapAlert));
      if (transactionRecords)
        setTransactions(transactionRecords.map(mapActivity));

      if (failures.length) {
        failures.forEach(({ name, error }) =>
          console.warn(`[EviLog] ${name} request failed:`, error),
        );
        setErrorMessage(
          health.reachable
            ? `Backend is online, but some data could not be loaded: ${failures.map(({ name }) => name).join(", ")}.`
            : `Backend is unavailable. Some data could not be loaded: ${failures.map(({ name }) => name).join(", ")}.`,
        );
      } else if (!health.reachable) {
        setErrorMessage(
          "Backend is unavailable. Check the API connection and retry.",
        );
      } else if (!health.healthy) {
        setErrorMessage(
          "Backend is reachable, but its health check reported a problem.",
        );
      } else {
        setErrorMessage("");
      }
    } catch (error) {
      console.error("[EviLog] Failed to process API responses:", error);
      setErrorMessage(
        `Data could not be displayed: ${error.message || "unexpected response error"}`,
      );
    } finally {
      if (initial) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const task = window.setTimeout(() => refreshData({ initial: true }), 0);
    return () => window.clearTimeout(task);
  }, [refreshData]);

  const availableRfidOptions = useMemo(
    () =>
      rfidTags
        .filter((tag) => String(tag.status).toLowerCase() === "available")
        .map((tag) => tag.rfid_id),
    [rfidTags],
  );
  const navItems = sidebarItems.map((item) => ({
    ...item,
    active: item.path === currentPath,
  }));

  const openEntity = (type, id) => {
    const paths = {
      case: "/cases",
      evidence: "/evidence",
      officer: "/officers",
    };
    if (type === "rfid") {
      setDetailSignal({ type, id, sequence: ++detailSignalSequence.current });
      navigate("/evidence");
      return;
    }
    const path = paths[type];
    if (!path || !id) return;
    setDetailSignal({ type, id, sequence: ++detailSignalSequence.current });
    navigate(path);
  };

  const handleAddCase = async (payload) => {
    const savedCase = await casesApi.create(
      asCaseRequest(payload.caseData || payload),
    );
    const createdEvidence = [];
    try {
      for (const item of payload.evidenceItems || []) {
        const savedEvidence = await evidenceApi.create(
          asEvidenceRequest({
            caseId: savedCase.case_id,
            name: item.evidenceName,
            type: item.evidenceType,
            description: item.description,
            status: item.status || "Stored",
          }),
        );
        createdEvidence.push(savedEvidence);
        if (item.assignedRfid)
          await rfidApi.assign({
            rfid_id: item.assignedRfid,
            evidence_id: savedEvidence.evidence_id,
          });
      }
    } catch (error) {
      await refreshData();
      throw new Error(
        `Case ${savedCase.case_id} was created, but a related evidence/RFID operation failed: ${error.message}`,
        { cause: error },
      );
    }
    await refreshData();
    return {
      id: savedCase.case_id,
      case: savedCase,
      evidence: createdEvidence,
    };
  };

  const handleUpdateCase = async (record) => {
    const result = await casesApi.update(record.id, asCaseRequest(record));
    await refreshData();
    return result;
  };

  const handleDeleteCase = async (caseId) => {
    await casesApi.delete(caseId);
    await refreshData();
  };

  const handleAddEvidenceRecord = async (record) => {
    const saved = await evidenceApi.create(asEvidenceRequest(record));
    try {
      if (record.rfid)
        await rfidApi.assign({
          rfid_id: record.rfid,
          evidence_id: saved.evidence_id,
        });
    } catch (error) {
      try {
        await evidenceApi.delete(saved.evidence_id);
      } catch {
        /* retain a partial record if audit data prevents rollback */
      }
      await refreshData();
      throw error;
    }
    await refreshData();
    return { id: saved.evidence_id, caseId: saved.case_id, rfid: record.rfid };
  };

  const handleAssignRfid = async (evidenceId, rfidValue) => {
    const target = evidence.find((item) => item.id === evidenceId);
    if (!target || !rfidValue) return false;
    if (target.rfid === rfidValue) return true;
    try {
      if (target.rfid)
        await rfidApi.release({
          rfid_id: target.rfid,
          evidence_id: evidenceId,
        });
      await rfidApi.assign({ rfid_id: rfidValue, evidence_id: evidenceId });
    } finally {
      await refreshData();
    }
    return true;
  };

  const handleUpdateEvidence = async (record) => {
    try {
      await evidenceApi.update(record.id, {
        evidence_name: record.name.trim(),
        evidence_type: toApiStatus(record.type),
        description:
          record.description?.trim() ||
          "No additional evidence description provided.",
        status: toApiStatus(record.status),
      });
      const current = evidence.find((item) => item.id === record.id);
      const nextRfid = record.rfid || "";
      if (current?.rfid !== nextRfid) {
        if (current?.rfid)
          await rfidApi.release({
            rfid_id: current.rfid,
            evidence_id: record.id,
          });
        if (nextRfid)
          await rfidApi.assign({ rfid_id: nextRfid, evidence_id: record.id });
      }
    } finally {
      await refreshData();
    }
  };

  const handleDeleteEvidence = async (evidenceId) => {
    await evidenceApi.delete(evidenceId);
    await refreshData();
  };

  const handleAddOfficer = async (
    record,
    _capturedSamples,
    preparedOfficerId,
  ) => {
    if (!preparedOfficerId)
      throw new Error(
        "Complete face enrollment before registering this officer.",
      );
    const saved = await officersApi.create({
      ...asOfficerRequest(record),
      officer_id: preparedOfficerId,
    });
    await refreshData();
    return { officer: mapOfficer(saved) };
  };

  const handlePrepareOfficerFace = (capturedSamples) =>
    alertsApi.prepareFaceEnrollment({
      front_profile:
        capturedSamples?.front_profile || capturedSamples?.["Front Profile"],
      left_profile:
        capturedSamples?.left_profile || capturedSamples?.["Left Profile"],
      right_profile:
        capturedSamples?.right_profile || capturedSamples?.["Right Profile"],
    });

  const handleCancelOfficerFace = (officerId) =>
    alertsApi.cancelFaceEnrollment(officerId);

  const handleUpdateOfficer = async (record) => {
    const saved = await officersApi.update(record.id, asOfficerRequest(record));
    await refreshData();
    return { officer: mapOfficer(saved) };
  };

  const handleDeleteOfficer = async (officerId) => {
    await officersApi.delete(officerId);
    await refreshData();
  };

  const handleEnrollFace = async (officerId, samples) => {
    const result = await alertsApi.enrollFace(officerId, samples);
    await refreshData();
    return result;
  };

  const handleMarkAlertAsRead = async (alertId) => {
    try {
      await alertsApi.markRead(alertId);
      setSecurityAlerts((current) =>
        current.map((alert) =>
          alert.id === alertId ? { ...alert, read: true } : alert,
        ),
      );
    } catch (error) {
      setErrorMessage(error.message);
    }
  };

  const handleMarkAllAlertsAsRead = async () => {
    try {
      await alertsApi.markAllRead();
      setSecurityAlerts((current) =>
        current.map((alert) => ({ ...alert, read: true })),
      );
    } catch (error) {
      setErrorMessage(error.message);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#edf3f7] text-slate-800">
      <div className="flex min-h-screen w-full flex-col lg:flex-row">
        <Sidebar items={navItems} />
        <div className="flex min-h-screen flex-1 flex-col bg-[#f3f6f8]">
          <Header
            title={meta.title}
            subtitle={meta.subtitle}
            alerts={securityAlerts}
            backendStatus={backendStatus}
            onMarkAlertAsRead={handleMarkAlertAsRead}
            onMarkAllAlertsAsRead={handleMarkAllAlertsAsRead}
          />
          {(loading || errorMessage) && (
            <div
              className={`mx-4 mt-2 rounded-lg px-3 py-2 text-xs ${errorMessage ? "border border-red-200 bg-red-50 text-red-700" : "text-slate-500"}`}
              role={errorMessage ? "alert" : "status"}
            >
              {errorMessage || "Loading records…"}
              {errorMessage && (
                <button
                  type="button"
                  className="ml-2 font-semibold underline"
                  onClick={() => refreshData({ initial: true })}
                >
                  Retry
                </button>
              )}
            </div>
          )}
          <main className="flex-1">
            <Routes>
              <Route
                path="/dashboard"
                element={
                  <Dashboard
                    cases={cases}
                    evidence={evidence}
                    officers={officers}
                    activityRows={transactions}
                    onOpenEntity={openEntity}
                    onRegisterCase={() => setRegisterCaseOpen(true)}
                    onRegisterOfficer={() =>
                      setDashboardOfficerOverlayOpen(true)
                    }
                    onRegisterEvidence={() => setRegisterEvidenceOpen(true)}
                    onAssignRfid={() => setAssignRfidOpen(true)}
                  />
                }
              />
              <Route
                path="/cases"
                element={
                  <Cases
                    cases={cases}
                    evidence={evidence}
                    activityRows={transactions}
                    openEntitySignal={detailSignal}
                    onOpenEntity={openEntity}
                    onAddCase={handleAddCase}
                    onUpdateCase={handleUpdateCase}
                    onDeleteCase={handleDeleteCase}
                    availableRfids={availableRfidOptions}
                  />
                }
              />
              <Route
                path="/evidence"
                element={
                  <Evidence
                    evidence={evidence}
                    officers={officers}
                    rfidTags={rfidTags}
                    rfidMappings={rfidMappings}
                    openEntitySignal={detailSignal}
                    onOpenEntity={openEntity}
                    onRegisterEvidence={() => setRegisterEvidenceOpen(true)}
                    onUpdateEvidence={handleUpdateEvidence}
                    onDeleteEvidence={handleDeleteEvidence}
                  />
                }
              />
              <Route
                path="/officers"
                element={
                  <Officers
                    officers={officers}
                    transactions={transactions}
                    alerts={securityAlerts}
                    openEntitySignal={detailSignal}
                    onOpenEntity={openEntity}
                    openRegisterSignal={registerOfficerOpen}
                    onRegisterSignalConsumed={() =>
                      setRegisterOfficerOpen(false)
                    }
                    onAddOfficer={handleAddOfficer}
                    onUpdateOfficer={handleUpdateOfficer}
                    onDeleteOfficer={handleDeleteOfficer}
                    onEnrollFace={handleEnrollFace}
                    onPrepareFace={handlePrepareOfficerFace}
                    onCancelFace={handleCancelOfficerFace}
                  />
                }
              />
              <Route
                path="/security-alerts"
                element={
                  <SecurityAlerts
                    alerts={securityAlerts}
                    onOpenEntity={openEntity}
                    onMarkAlertAsRead={handleMarkAlertAsRead}
                    onMarkAllAlertsAsRead={handleMarkAllAlertsAsRead}
                  />
                }
              />
              <Route path="/settings" element={<Settings />} />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </main>
        </div>
      </div>

      <OfficerRegistrationOverlay
        isOpen={dashboardOfficerOverlayOpen}
        onClose={() => setDashboardOfficerOverlayOpen(false)}
        onAddOfficer={handleAddOfficer}
        onPrepareFace={handlePrepareOfficerFace}
        onCancelFace={handleCancelOfficerFace}
      />
      <RegisterCaseOverlay
        isOpen={registerCaseOpen}
        availableRfids={availableRfidOptions}
        onClose={() => setRegisterCaseOpen(false)}
        onCaseRegistered={handleAddCase}
      />
      <RegisterEvidenceOverlay
        isOpen={registerEvidenceOpen}
        cases={cases}
        evidence={evidence}
        rfidTags={availableRfidOptions}
        currentlyAssignedRfids={evidence
          .map((item) => item.rfid)
          .filter(Boolean)}
        onClose={() => setRegisterEvidenceOpen(false)}
        onRegister={handleAddEvidenceRecord}
      />
      <AssignRfidOverlay
        isOpen={assignRfidOpen}
        evidence={evidence}
        availableRfids={availableRfidOptions}
        onClose={() => setAssignRfidOpen(false)}
        onAssign={handleAssignRfid}
      />
    </div>
  );
}
