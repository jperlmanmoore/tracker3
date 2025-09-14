import React, { useState, useEffect, useMemo } from 'react';
import { Container, Row, Col, Card, Button, Table, Form, Badge, Alert, Spinner, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import { Package } from '../types/package';
import { ApiResponse } from '../types/common';
import AddPackageModal from './AddPackageModal';
import BulkProofOfDeliveryModal from './BulkProofOfDeliveryModal';
import EditPackageModal from './EditPackageModal';
import DeleteCustomerModal from './DeleteCustomerModal';
import UserSettings from './UserSettings';
import axios from 'axios';
import { FaPlus, FaSignOutAlt, FaTrash, FaEdit, FaEye, FaSearch, FaFilter, FaSortUp, FaSortDown, FaCog, FaBox, FaCheckCircle, FaTruck, FaUsers, FaSync } from 'react-icons/fa';
import './Dashboard.css';

const Dashboard: React.FC = () => {
  // State declarations
  const [packages, setPackages] = useState<Array<{ _id: string; packages: Package[] }>>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [sortBy, setSortBy] = useState<'date' | 'client' | 'carrier' | 'status'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterClient, setFilterClient] = useState<string>('');
  const [filterCarrier, setFilterCarrier] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showBulkProofModal, setShowBulkProofModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [showDeleteCustomerModal, setShowDeleteCustomerModal] = useState<boolean>(false);
  const [showUserSettings, setShowUserSettings] = useState<boolean>(false);
  const [selectedPackageForEdit, setSelectedPackageForEdit] = useState<any>(null);

  const [globalSearch, setGlobalSearch] = useState<string>('');

  // Enhanced filtered data with global search
  const filteredAndSortedGroupedPackages = useMemo(() => {
    if (!Array.isArray(packages)) return [];

    // Filter groups by client name if needed
    let groups = packages;
    if (filterClient) {
      groups = groups.filter(group =>
        group._id && group._id.toLowerCase().includes(filterClient.toLowerCase())
      );
    }

    // Global search across all packages
    if (globalSearch) {
      groups = groups.map(group => ({
        ...group,
        packages: group.packages.filter(pkg =>
          pkg.trackingNumber?.toLowerCase().includes(globalSearch.toLowerCase()) ||
          pkg.customer?.toLowerCase().includes(globalSearch.toLowerCase()) ||
          pkg.carrier?.toLowerCase().includes(globalSearch.toLowerCase()) ||
          pkg.status?.toLowerCase().includes(globalSearch.toLowerCase())
        )
      })).filter(group => group.packages.length > 0);
    }

    // For each group, filter and sort its packages
    return groups
      .map(group => {
        let pkgs = group.packages || [];

        // Filter by carrier
        if (filterCarrier) {
          pkgs = pkgs.filter(pkg =>
            pkg.carrier && pkg.carrier.toLowerCase() === filterCarrier.toLowerCase()
          );
        }

        // Sort packages
        pkgs = pkgs.slice().sort((a, b) => {
          let comparison = 0;
          switch (sortBy) {
            case 'date':
              comparison = new Date(a.dateSent || a.createdAt || 0).getTime() - new Date(b.dateSent || b.createdAt || 0).getTime();
              break;
            case 'carrier':
              comparison = (a.carrier || '').localeCompare(b.carrier || '');
              break;
            case 'status':
              comparison = (a.status || '').localeCompare(b.status || '');
              break;
          }
          return sortOrder === 'desc' ? -comparison : comparison;
        });

        return { ...group, packages: pkgs };
      })
      // Remove groups with no packages after filtering
      .filter(group => group.packages && group.packages.length > 0);
  }, [packages, filterClient, filterCarrier, sortBy, sortOrder, globalSearch]);
  const [selectedCustomerForDelete, setSelectedCustomerForDelete] = useState<{
    name: string;
    packageCount: number;
  }>({ name: '', packageCount: 0 });
  const [selectedCustomer, setSelectedCustomer] = useState<{
    name: string;
    packages: Array<{
      trackingNumber: string;
      carrier: string;
      status: string;
      deliveryDate?: string;
    }>;
  }>({ name: '', packages: [] });

  // Moved out of useState
  const renderGroupedPackages = (groupedData: any[]): React.ReactNode => {
    const data = Array.isArray(groupedData) ? groupedData : [];
    if (data.length === 0) {
      return <tr><td colSpan={7}>No packages found</td></tr>;
    }
    return data.map((group: any) => {
      // Group packages by carrier within each client
      const packagesByCarrier = (group.packages || []).reduce((acc: any, pkg: any) => {
        const carrier = pkg.carrier || 'Unknown';
        if (!acc[carrier]) {
          acc[carrier] = [];
        }
        acc[carrier].push(pkg);
        return acc;
      }, {});

      const carriers = Object.keys(packagesByCarrier);

      return (
        <React.Fragment key={group._id}>
          <tr className="client-header-row">
            <td colSpan={6} className="client-row bg-light py-2">
              <div className="d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center">
                  <OverlayTrigger placement="top" overlay={<Tooltip>Delete Client and All Packages</Tooltip>}>
                    <button
                      type="button"
                      className="btn btn-link text-danger p-0 me-2 delete-client-btn"
                      onClick={() => openDeleteCustomer(group._id, group.packages?.length || 0)}
                      title="Delete client and all packages"
                    >
                      ×
                    </button>
                  </OverlayTrigger>
                  <strong>{group._id}</strong> ({group.packages?.length || 0} packages)
                </div>
                <div className="customer-actions d-flex gap-2">
                  {group.packages?.some((pkg: any) => pkg.status && pkg.status.toLowerCase() === 'delivered') && (
                    <OverlayTrigger placement="top" overlay={<Tooltip>View Proof of Delivery for All Delivered Packages</Tooltip>}>
                      <Button 
                        variant="outline-success" 
                        size="sm"
                        className="d-flex align-items-center gap-1"
                        onClick={() => openBulkProofOfDelivery(group._id, group.packages)}
                        title="View Proof of Delivery for all delivered packages"
                      >
                        {FaEye({size: 12})}
                        View All POD
                      </Button>
                    </OverlayTrigger>
                  )}
                  {carriers.map(carrier => {
                    const carrierPackages = packagesByCarrier[carrier];
                    if (carrierPackages.length === 1) {
                      return (
                        <OverlayTrigger key={carrier} placement="top" overlay={<Tooltip>Track {carrier} Package</Tooltip>}>
                          <Button 
                            variant="outline-primary" 
                            size="sm"
                            className="d-flex align-items-center gap-1"
                            onClick={() => openTrackingUrl(carrierPackages[0].trackingNumber, carrier)}
                          >
                            {FaSearch({size: 12})}
                            Track {carrier}
                          </Button>
                        </OverlayTrigger>
                      );
                    } else {
                      // Multiple packages for this carrier - create bulk tracking URL
                      const trackingNumbers = carrierPackages.map((p: any) => p.trackingNumber);
                      const bulkUrl = carrier.toLowerCase() === 'usps' 
                        ? `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumbers.join(',')}`
                        : `https://www.fedex.com/fedextrack/?trknbr=${trackingNumbers.join(',')}`;
                      
                      return (
                        <OverlayTrigger key={carrier} placement="top" overlay={<Tooltip>Track All {carrier} Packages</Tooltip>}>
                          <Button 
                            variant="outline-primary" 
                            size="sm"
                            className="d-flex align-items-center gap-1"
                            onClick={() => window.open(bulkUrl, '_blank')}
                          >
                            {FaSearch({size: 12})}
                            Track All {carrier} ({carrierPackages.length})
                          </Button>
                        </OverlayTrigger>
                      );
                    }
                  })}
                </div>
              </div>
            </td>
          </tr>
          {group.packages?.map((pkg: any, index: number) => (
            <tr key={index}>
              <td className="py-2">{new Date(pkg.dateSent || pkg.createdAt || Date.now()).toLocaleDateString()}</td>
              <td className="py-2">{group._id}</td>
              <td className="py-2 px-1">
                <Badge bg={getCarrierBadgeVariant(pkg.carrier || '')}>
                  {pkg.carrier}
                </Badge>
              </td>
              <td className="py-2">
                <Badge bg={getStatusBadgeVariant(pkg.status || '')}>
                  {pkg.status || 'Unknown'}
                </Badge>
              </td>
              <td className="py-2 px-1">
                <div className="d-flex align-items-center">
                  <div className="d-flex align-items-center gap-2">
                    <OverlayTrigger placement="top" overlay={<Tooltip>Track Package</Tooltip>}>
                      <button
                        type="button"
                        onClick={() => openTrackingUrl(pkg.trackingNumber, pkg.carrier)}
                        className="btn btn-link text-primary p-0 dashboard-track-btn"
                        aria-label={`Track package ${pkg.trackingNumber}`}
                      >
                        {FaSearch({size: 14, className: "me-1"})}
                        {pkg.trackingNumber}
                      </button>
                    </OverlayTrigger>
                    <div className="d-flex gap-1">
                      <OverlayTrigger placement="top" overlay={<Tooltip>Edit Package</Tooltip>}>
                        <button
                          type="button"
                          className="btn btn-link text-secondary p-0"
                          onClick={() => openEditPackage({
                            ...pkg,
                            customer: group._id
                          })}
                          title="Edit Package"
                        >
                          {FaEdit({size: 12})}
                        </button>
                      </OverlayTrigger>
                      <OverlayTrigger placement="top" overlay={<Tooltip>Delete Package</Tooltip>}>
                        <button
                          type="button"
                          className="btn btn-link text-danger p-0"
                          onClick={() => deletePackage(pkg._id)}
                          title="Delete Package"
                        >
                          {FaTrash({size: 12})}
                        </button>
                      </OverlayTrigger>
                    </div>
                  </div>
                </div>
              </td>
              <td className="py-2">
                {/* Individual package actions */}
                <div className="package-actions">
                  {/* Removed simulate delivery button for production use */}
                </div>
              </td>
            </tr>
          ))}
        </React.Fragment>
      );
    });
  };

  const { user, logout } = useAuth();

  useEffect(() => {
    fetchGroupedPackages();
  }, []);

  const fetchGroupedPackages = async (): Promise<void> => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get<ApiResponse<any[]>>('/api/packages/grouped', {
        headers: { Authorization: `Bearer ${token}` },
        params: { _t: Date.now() } // Cache-busting parameter
      });

      if (response.data.success && response.data.data) {
        setPackages(response.data.data);
      } else {
        console.error('Invalid grouped packages data:', response.data);
        setPackages([]);
        setError('Failed to fetch grouped packages - invalid data format');
      }
    } catch (err: any) {
      console.error('Fetch grouped packages error:', err);
      setPackages([]);
      setError(err.response?.data?.message || 'Failed to fetch grouped packages');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get all individual packages from grouped data
  // ...existing code...

  const getStatusBadgeVariant = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'delivered':
        return 'success';
      case 'in transit':
        return 'primary';
      case 'out for delivery':
        return 'warning';
      case 'pending':
        return 'secondary';
      default:
        return 'light';
    }
  };

  const getCarrierBadgeVariant = (carrier: string): string => {
    switch (carrier.toLowerCase()) {
      case 'usps':
        return 'info';
      case 'fedex':
        return 'dark';
      default:
        return 'secondary';
    }
  };

  const openTrackingUrl = (trackingNumber: string, carrier: string): void => {
    let url = '';
    
    if (carrier.toLowerCase() === 'usps') {
      url = `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`;
    } else if (carrier.toLowerCase() === 'fedex') {
      url = `https://www.fedex.com/fedextrack/?tracknumber=${trackingNumber}`;
    }
    
    if (url) {
      window.open(url, '_blank');
    }
  };

  const openBulkProofOfDelivery = (customer: string, packages: any[]): void => {
    setSelectedCustomer({
      name: customer,
      packages: packages.map(pkg => ({
        trackingNumber: pkg.trackingNumber,
        carrier: pkg.carrier,
        status: pkg.status,
        deliveryDate: pkg.deliveryDate
      }))
    });
    setShowBulkProofModal(true);
  };

  const openEditPackage = (packageData: any): void => {
    setSelectedPackageForEdit({
      ...packageData,
      customer: packageData.customer || packageData.clientName
    });
    setShowEditModal(true);
  };

  const openDeleteCustomer = (customerName: string, packageCount: number): void => {
    setSelectedCustomerForDelete({
      name: customerName,
      packageCount
    });
    setShowDeleteCustomerModal(true);
  };

  const handleSort = (column: 'date' | 'client' | 'carrier' | 'status'): void => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const deletePackage = async (packageId: string): Promise<void> => {
    if (!window.confirm('Are you sure you want to delete this package?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/packages/${packageId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setPackages(prevGroups =>
        prevGroups
          .map(group => ({
            ...group,
            packages: group.packages.filter(pkg => pkg._id !== packageId)
          }))
          .filter(group => group.packages.length > 0)
      );
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete package');
    }
  };

  const refreshAllPackages = async (): Promise<void> => {
    try {
      setLoading(true);
      setError('');

      // Get all package IDs from the current packages
      const allPackageIds = filteredAndSortedGroupedPackages.flatMap(group =>
        group.packages.map(pkg => pkg._id)
      );

      if (allPackageIds.length === 0) {
        setError('No packages to refresh');
        return;
      }

      const token = localStorage.getItem('token');
      const response = await axios.post('/api/packages/bulk-refresh', {
        packageIds: allPackageIds
      }, {
        headers: { Authorization: `Bearer ${token}` },
        params: { _t: Date.now() } // Cache-busting parameter
      });

      if (response.data.success) {
        // Refresh the packages list to show updated statuses
        await fetchGroupedPackages();
        
        // Show success message with update count
        const { updatedPackages, totalPackages } = response.data.data;
        if (updatedPackages > 0) {
          setSuccess(`${updatedPackages} of ${totalPackages} packages updated with latest tracking information`);
          setTimeout(() => setSuccess(''), 5000);
        } else {
          setSuccess('All packages are up to date');
          setTimeout(() => setSuccess(''), 3000);
        }
      } else {
        setError(response.data.message || 'Failed to refresh packages');
      }
    } catch (err: any) {
      console.error('Bulk refresh error:', err);
      setError(err.response?.data?.message || 'Failed to refresh packages');
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    return (
      <Container className="mt-5 text-center fade-in">
        <Card className="p-5 shadow">
          <Spinner animation="border" role="status" className="mb-3">
            <span className="visually-hidden">Loading packages...</span>
          </Spinner>
          <h5 className="text-muted">Loading your packages...</h5>
        </Card>
      </Container>
    );
  }

  return showUserSettings ? (
    <UserSettings onBack={() => setShowUserSettings(false)} />
  ) : (
    <>
      <Container fluid className="py-4 fade-in">
        {/* Modern Header */}
        <div className="modern-header">
          <div className="header-content">
            <div className="header-text">
              <h1 className="display-4 fw-bold mb-1">📦 Package Dashboard</h1>
              <p className="text-black lead mb-0">
                Welcome back, {user?.firstName || user?.username}!
              </p>
            </div>
            <div className="header-actions">
              <div className="search-container me-3">
                <Form.Control
                  type="text"
                  placeholder="Search packages..."
                  className="search-input"
                  value={globalSearch}
                  onChange={(e) => setGlobalSearch(e.target.value)}
                />
                {FaSearch({className: "search-icon"})}
              </div>
              <div className="d-flex gap-2">
                <OverlayTrigger placement="bottom" overlay={<Tooltip>Refresh All Package Statuses</Tooltip>}>
                  <Button 
                    variant="outline-light" 
                    className="glass-button d-flex align-items-center gap-2"
                    onClick={refreshAllPackages}
                    disabled={loading}
                  >
                    {FaSync({size: 14})}
                    Refresh All
                  </Button>
                </OverlayTrigger>
                <OverlayTrigger placement="bottom" overlay={<Tooltip>User Settings</Tooltip>}>
                  <Button 
                    variant="outline-light" 
                    className="glass-button d-flex align-items-center gap-2"
                    onClick={() => setShowUserSettings(true)}
                  >
                    {FaCog({size: 14})}
                    Settings
                  </Button>
                </OverlayTrigger>
                <OverlayTrigger placement="bottom" overlay={<Tooltip>Add New Package</Tooltip>}>
                  <Button 
                    variant="outline-light" 
                    className="glass-button d-flex align-items-center gap-2"
                    onClick={() => setShowAddModal(true)}
                  >
                    {FaPlus({size: 14})}
                    Add Package
                  </Button>
                </OverlayTrigger>
                <OverlayTrigger placement="bottom" overlay={<Tooltip>Logout</Tooltip>}>
                  <Button variant="outline-light" className="glass-button d-flex align-items-center gap-2" onClick={logout}>
                    {FaSignOutAlt({size: 14})}
                    Logout
                  </Button>
                </OverlayTrigger>
              </div>
            </div>
          </div>
        </div>

        {error && <Alert variant="danger" dismissible onClose={() => setError('')} className="mb-3">{error}</Alert>}
        {success && <Alert variant="success" dismissible onClose={() => setSuccess('')} className="mb-3">{success}</Alert>}

        {/* Filters */}
        <Card className="glass-card mb-3">
          <Card.Body className="py-3">
            <Row>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Filter by Client</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Enter client name..."
                    value={filterClient}
                    onChange={(e) => setFilterClient(e.target.value)}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label htmlFor="filter-select">Filter by Carrier</Form.Label>
                  <Form.Select
                    id="filter-select"
                    value={filterCarrier}
                    onChange={(e) => setFilterCarrier(e.target.value)}
                    aria-label="Filter by carrier"
                    title="Filter packages by shipping carrier (USPS or FedEx)"
                  >
                    <option value="">All Carriers</option>
                    <option value="usps">USPS</option>
                    <option value="fedex">FedEx</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={4} className="d-flex align-items-end">
                <OverlayTrigger placement="top" overlay={<Tooltip>Clear All Filters</Tooltip>}>
                  <Button 
                    variant="outline-light" 
                    className="glass-button d-flex align-items-center gap-2"
                    onClick={() => {
                      setFilterClient('');
                      setFilterCarrier('');
                      setGlobalSearch('');
                    }}
                  >
                    {FaFilter({size: 14})}
                    Clear Filters
                  </Button>
                </OverlayTrigger>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* Statistics */}
        <Row className="mb-4">
          <Col md={3}>
            <Card className="glass-card text-center stat-card card-hover">
              <Card.Body className="py-3">
                <div className="stat-icon mb-2">
                  {FaBox({size: 24})}
                </div>
                <h2 className="text-white mb-1 fw-bold">
                  {filteredAndSortedGroupedPackages.reduce((acc, group) => acc + group.packages.length, 0)}
                </h2>
                <p className="text-white-50 mb-0 small fw-medium">Total Packages</p>
                <div className="stat-trend mt-2">
                  <small className="text-white-75">↗️ +12% this month</small>
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="glass-card text-center stat-card card-hover">
              <Card.Body className="py-3">
                <div className="stat-icon mb-2">
                  {FaCheckCircle({size: 24})}
                </div>
                <h2 className="text-white mb-1 fw-bold">
                  {filteredAndSortedGroupedPackages.reduce((acc, group) => acc + group.packages.filter(p => p.status && p.status.toLowerCase() === 'delivered').length, 0)}
                </h2>
                <p className="text-white-50 mb-0 small fw-medium">Delivered</p>
                <div className="stat-trend mt-2">
                  <small className="text-white-75">↗️ +8% this week</small>
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="glass-card text-center stat-card card-hover">
              <Card.Body className="py-3">
                <div className="stat-icon mb-2">
                  {FaTruck({size: 24})}
                </div>
                <h2 className="text-white mb-1 fw-bold">
                  {filteredAndSortedGroupedPackages.reduce((acc, group) => acc + group.packages.filter(p => p.status && p.status.toLowerCase() === 'in transit').length, 0)}
                </h2>
                <p className="text-white-50 mb-0 small fw-medium">In Transit</p>
                <div className="stat-trend mt-2">
                  <small className="text-white-75">↗️ +15% today</small>
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="glass-card text-center stat-card card-hover">
              <Card.Body className="py-3">
                <div className="stat-icon mb-2">
                  {FaUsers({size: 24})}
                </div>
                <h2 className="text-white mb-1 fw-bold">{filteredAndSortedGroupedPackages.length}</h2>
                <p className="text-white-50 mb-0 small fw-medium">Unique Clients</p>
                <div className="stat-trend mt-2">
                  <small className="text-white-75">↗️ +5% this month</small>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Packages Table */}
        <Card className="glass-card">
          <Card.Body className="py-3">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0 text-white">Package List ({filteredAndSortedGroupedPackages.reduce((acc, group) => acc + group.packages.length, 0)})</h5>
              <small className="text-white-75">
                Sorted by {sortBy} ({sortOrder === 'asc' ? 'ascending' : 'descending'})
              </small>
            </div>

            {filteredAndSortedGroupedPackages.length === 0 ? (
              <div className="text-center py-5">
                {FaBox({size: 48, className: "text-white-50 mb-3"})}
                <p className="text-white-75">No packages found.</p>
                <Button variant="primary" onClick={() => setShowAddModal(true)} className="mt-3">
                  Add Your First Package
                </Button>
              </div>
            ) : (
              <div className="table-responsive">
                <Table hover className="modern-table mb-0">
                  <thead>
                    <tr>
                      <th 
                        className="sortable-header py-2"
                        onClick={() => handleSort('date')}
                      >
                        Date Added {sortBy === 'date' && (sortOrder === 'asc' ? FaSortUp({}) : FaSortDown({}))}
                      </th>
                      <th 
                        className="sortable-header py-2"
                        onClick={() => handleSort('client')}
                      >
                        Client {sortBy === 'client' && (sortOrder === 'asc' ? FaSortUp({}) : FaSortDown({}))}
                      </th>
                      <th 
                        className="sortable-header py-2 px-1"
                        onClick={() => handleSort('carrier')}
                      >
                        Carrier {sortBy === 'carrier' && (sortOrder === 'asc' ? FaSortUp({}) : FaSortDown({}))}
                      </th>
                      <th 
                        className="sortable-header py-2"
                        onClick={() => handleSort('status')}
                      >
                        Status {sortBy === 'status' && (sortOrder === 'asc' ? FaSortUp({}) : FaSortDown({}))}
                      </th>
                      <th className="py-2 px-1">
                        Tracking
                      </th>
                      <th className="py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {renderGroupedPackages(filteredAndSortedGroupedPackages)}
                  </tbody>
                </Table>
              </div>
            )}
          </Card.Body>
        </Card>
      </Container>

      <AddPackageModal
        show={showAddModal}
        onHide={() => setShowAddModal(false)}
        onPackageAdded={fetchGroupedPackages}
      />

      <BulkProofOfDeliveryModal
        show={showBulkProofModal}
        onHide={() => setShowBulkProofModal(false)}
        customer={selectedCustomer.name}
        packages={selectedCustomer.packages}
      />

      <EditPackageModal
        show={showEditModal}
        onHide={() => setShowEditModal(false)}
        package={selectedPackageForEdit}
        onPackageUpdated={fetchGroupedPackages}
      />

      <DeleteCustomerModal
        show={showDeleteCustomerModal}
        onHide={() => setShowDeleteCustomerModal(false)}
        customerName={selectedCustomerForDelete.name}
        packageCount={selectedCustomerForDelete.packageCount}
        onCustomerDeleted={fetchGroupedPackages}
      />
    </>
  );
};

export default Dashboard;
