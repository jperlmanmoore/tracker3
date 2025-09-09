import React, { useState, useEffect, useMemo } from 'react';
import { Container, Row, Col, Card, Button, Table, Form, Badge, Alert, Spinner, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import { Package } from '../types/package';
import { ApiResponse } from '../types/common';
import AddPackageModal from './AddPackageModal';
import ProofOfDeliveryModal from './ProofOfDeliveryModal';
import BulkProofOfDeliveryModal from './BulkProofOfDeliveryModal';
import EditPackageModal from './EditPackageModal';
import DeleteCustomerModal from './DeleteCustomerModal';
import axios from 'axios';
import { FaPlus, FaSignOutAlt, FaTrash, FaEdit, FaEye, FaTruck, FaSearch, FaFilter, FaSortUp, FaSortDown } from 'react-icons/fa';
import './Dashboard.css';

const Dashboard: React.FC = () => {
  // ...existing useState declarations...


  // State declarations
  const [packages, setPackages] = useState<Array<{ _id: string; packages: Package[] }>>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [sortBy, setSortBy] = useState<'date' | 'client' | 'carrier' | 'status'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterClient, setFilterClient] = useState<string>('');
  const [filterCarrier, setFilterCarrier] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showProofModal, setShowProofModal] = useState<boolean>(false);
  const [showBulkProofModal, setShowBulkProofModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [showDeleteCustomerModal, setShowDeleteCustomerModal] = useState<boolean>(false);
  const [selectedPackage, setSelectedPackage] = useState<{
    id?: string;
    trackingNumber?: string;
    customer?: string;
    carrier?: string;
  }>({});
  const [selectedPackageForEdit, setSelectedPackageForEdit] = useState<any>(null);

  // Grouped filter/sort logic for table rendering
  const filteredAndSortedGroupedPackages = useMemo(() => {
    if (!Array.isArray(packages)) return [];

    // Filter groups by client name if needed
    let groups = packages;
    if (filterClient) {
      groups = groups.filter(group =>
        group._id && group._id.toLowerCase().includes(filterClient.toLowerCase())
      );
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
  }, [packages, filterClient, filterCarrier, sortBy, sortOrder]);
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
            <td colSpan={6} className="client-row bg-light">
              <div className="d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center">
                  <OverlayTrigger placement="top" overlay={<Tooltip>Delete Client and All Packages</Tooltip>}>
                    <Button 
                      variant="outline-danger" 
                      size="sm"
                      className="me-2 d-flex align-items-center gap-1"
                      onClick={() => openDeleteCustomer(group._id, group.packages?.length || 0)}
                      title="Delete client and all packages"
                    >
                      {FaTrash({size: 12})}
                      Delete
                    </Button>
                  </OverlayTrigger>
                  <strong>{group._id}</strong> ({group.packages?.length || 0} packages)
                </div>
                <div className="customer-actions">
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
                </div>
              </div>
            </td>
          </tr>
          {group.packages?.map((pkg: any, index: number) => (
            <tr key={index}>
              <td>{new Date(pkg.dateSent || pkg.createdAt || Date.now()).toLocaleDateString()}</td>
              <td>{group._id}</td>
              <td className="d-flex align-items-center">
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
              </td>
              <td>
                <Badge bg={getCarrierBadgeVariant(pkg.carrier || '')}>
                  {pkg.carrier}
                </Badge>
              </td>
              <td>
                <Badge bg={getStatusBadgeVariant(pkg.status || '')}>
                  {pkg.status || 'Unknown'}
                </Badge>
              </td>
              <td>
                {index === 0 && (
                  <div className="d-flex flex-column gap-1">
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
                )}
                {/* Individual package actions */}
                <div className="package-actions">
                  {pkg.status && pkg.status.toLowerCase() !== 'delivered' && (
                    <OverlayTrigger placement="top" overlay={<Tooltip>Simulate Delivery</Tooltip>}>
                      <Button 
                        variant="outline-warning" 
                        size="sm"
                        onClick={() => simulateDelivery({
                          ...pkg,
                          customer: group._id
                        })}
                        className="d-flex align-items-center gap-1"
                        title="Simulate Delivery (for testing)"
                      >
                        {FaTruck({size: 12})}
                        Simulate
                      </Button>
                    </OverlayTrigger>
                  )}
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
        headers: { Authorization: `Bearer ${token}` }
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

  const simulateDelivery = async (packageData: any): Promise<void> => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`/api/packages/${packageData._id}/simulate-delivery`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        // Refresh the packages list to show updated status
        fetchGroupedPackages();
      } else {
        setError(response.data.message || 'Failed to simulate delivery');
      }
    } catch (err: any) {
      console.error('Simulate delivery error:', err);
      setError(err.response?.data?.message || 'Failed to simulate delivery');
    }
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

  return (
    <Container fluid className="py-4 fade-in">
      <Row>
        <Col>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h1 className="text-primary mb-3">📦 Package Dashboard</h1>
              <p className="text-muted mb-0">Welcome back, {user?.firstName || user?.username}!</p>
            </div>
            <div className="d-flex gap-2">
              <OverlayTrigger placement="bottom" overlay={<Tooltip>Add New Package</Tooltip>}>
                <Button 
                  variant="primary" 
                  className="d-flex align-items-center gap-2"
                  onClick={() => setShowAddModal(true)}
                >
                  {FaPlus({size: 14})}
                  Add Package
                </Button>
              </OverlayTrigger>
              <OverlayTrigger placement="bottom" overlay={<Tooltip>Logout</Tooltip>}>
                <Button variant="outline-secondary" onClick={logout} className="d-flex align-items-center gap-2">
                  {FaSignOutAlt({size: 14})}
                  Logout
                </Button>
              </OverlayTrigger>
            </div>
          </div>

          {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}

          {/* Filters */}
          <Card className="mb-4">
            <Card.Body>
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
                      title="Filter by carrier"
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
                      variant="outline-secondary" 
                      className="d-flex align-items-center gap-2"
                      onClick={() => {
                        setFilterClient('');
                        setFilterCarrier('');
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
              <Card className="text-center">
                <Card.Body>
                  <h3 className="text-primary">{
                    filteredAndSortedGroupedPackages.reduce((acc, group) => acc + group.packages.length, 0)
                  }</h3>
                  <p className="text-muted mb-0">Total Packages</p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="text-center">
                <Card.Body>
                  <h3 className="text-success">{
                    filteredAndSortedGroupedPackages.reduce((acc, group) => acc + group.packages.filter(p => p.status && p.status.toLowerCase() === 'delivered').length, 0)
                  }</h3>
                  <p className="text-muted mb-0">Delivered</p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="text-center">
                <Card.Body>
                  <h3 className="text-warning">{
                    filteredAndSortedGroupedPackages.reduce((acc, group) => acc + group.packages.filter(p => p.status && p.status.toLowerCase() === 'in transit').length, 0)
                  }</h3>
                  <p className="text-muted mb-0">In Transit</p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="text-center">
                <Card.Body>
                  <h3 className="text-info">{filteredAndSortedGroupedPackages.length}</h3>
                  <p className="text-muted mb-0">Unique Clients</p>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Packages Table */}
          <Card>
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="mb-0">Package List ({filteredAndSortedGroupedPackages.reduce((acc, group) => acc + group.packages.length, 0)})</h5>
                <small className="text-muted">
                  Sorted by {sortBy} ({sortOrder === 'asc' ? 'ascending' : 'descending'})
                </small>
              </div>

              {filteredAndSortedGroupedPackages.length === 0 ? (
                <div className="text-center py-5">
                  <p className="text-muted">No packages found.</p>
                  <Button variant="primary" onClick={() => setShowAddModal(true)}>
                    Add Your First Package
                  </Button>
                </div>
              ) : (
                <div className="table-responsive">
                  <Table hover>
                    <thead>
                      <tr>
                        <th 
                          className="sortable-header"
                          onClick={() => handleSort('date')}
                        >
                          Date Added {sortBy === 'date' && (sortOrder === 'asc' ? FaSortUp({}) : FaSortDown({}))}
                        </th>
                        <th 
                          className="sortable-header"
                          onClick={() => handleSort('client')}
                        >
                          Client {sortBy === 'client' && (sortOrder === 'asc' ? FaSortUp({}) : FaSortDown({}))}
                        </th>
                        <th 
                          className="sortable-header"
                          onClick={() => handleSort('carrier')}
                        >
                          Carrier {sortBy === 'carrier' && (sortOrder === 'asc' ? FaSortUp({}) : FaSortDown({}))}
                        </th>
                        <th 
                          className="sortable-header"
                          onClick={() => handleSort('status')}
                        >
                          Status {sortBy === 'status' && (sortOrder === 'asc' ? FaSortUp({}) : FaSortDown({}))}
                        </th>
                        <th>Actions</th>
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
        </Col>
      </Row>

      <AddPackageModal
        show={showAddModal}
        onHide={() => setShowAddModal(false)}
        onPackageAdded={fetchGroupedPackages}
      />

      <ProofOfDeliveryModal
        show={showProofModal}
        onHide={() => setShowProofModal(false)}
        packageId={selectedPackage.id}
        trackingNumber={selectedPackage.trackingNumber}
        customer={selectedPackage.customer}
        carrier={selectedPackage.carrier}
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
    </Container>
  );
};

export default Dashboard;
