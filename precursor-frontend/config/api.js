
export const API_BASE_URL = 'http://192.168.1.4:3000'; 

const handleResponse = async (response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }
  return response.json();
};

// ============================================================================
// API Endpoints
// ============================================================================

export const api = {
  // Health check
  checkHealth: async () => {
    const response = await fetch(`${API_BASE_URL}/health`);
    return handleResponse(response);
  },

  // ========================================================================
  // MANUFACTURER ENDPOINTS
  // ========================================================================

  // Create new shipment
  createShipment: async (shipmentData) => {
    const response = await fetch(`${API_BASE_URL}/shipments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(shipmentData)
    });
    return handleResponse(response);
  },

  // Get all shipments
  getShipments: async () => {
    const response = await fetch(`${API_BASE_URL}/shipments`);
    return handleResponse(response);
  },

  // ========================================================================
  // DRIVER ENDPOINTS
  // ========================================================================

  // Get specific shipment details with events
  getShipmentDetails: async (shipmentId) => {
    const response = await fetch(`${API_BASE_URL}/shipments/${shipmentId}`);
    return handleResponse(response);
  },

  // Record checkpoint scan
  recordCheckpointScan: async (shipmentId, scanData) => {
    const response = await fetch(`${API_BASE_URL}/shipments/${shipmentId}/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scanData)
    });
    return handleResponse(response);
  },

  // ========================================================================
  // GPS SIMULATION ENDPOINTS
  // ========================================================================

  // Get current GPS state
  getGPSState: async () => {
    const response = await fetch(`${API_BASE_URL}/simulate`);
    return handleResponse(response);
  },

  // Manually trigger GPS step
  triggerGPSStep: async () => {
    const response = await fetch(`${API_BASE_URL}/simulate/step`, {
      method: 'POST'
    });
    return handleResponse(response);
  },

  // ========================================================================
  // REGULATOR ENDPOINTS
  // ========================================================================

  // Get all events (audit log)
  getAllEvents: async () => {
    const response = await fetch(`${API_BASE_URL}/events`);
    return handleResponse(response);
  }
};

// ============================================================================
// Utility Functions
// ============================================================================

// Format status for display
export const formatStatus = (status) => {
  const statusMap = {
    'Pending': 'CREATED',
    'In Transit': 'IN_TRANSIT',
    'OFF_ROUTE': 'OFF_ROUTE',
    'Delivered': 'DELIVERED'
  };
  return statusMap[status] || status;
};

// Get status color
export const getStatusColor = (status) => {
  const colors = {
    'CREATED': '#6B7280',
    'IN_TRANSIT': '#3B82F6',
    'OFF_ROUTE': '#EF4444',
    'DELIVERED': '#10B981'
  };
  return colors[status] || '#6B7280';
};

// Format date
export const formatDate = (isoString) => {
  const date = new Date(isoString);
  const options = { month: 'short', day: 'numeric', year: 'numeric' };
  return date.toLocaleDateString('en-US', options);
};

// Calculate shipment stats
export const calculateStats = (shipments) => {
  const active = shipments.filter(s => 
    s.status === 'In Transit' || s.status === 'Pending'
  ).length;
  
  const total = shipments.length;
  
  const offRoute = shipments.filter(s => s.status === 'OFF_ROUTE').length;
  
  return { active, total, offRoute };
};