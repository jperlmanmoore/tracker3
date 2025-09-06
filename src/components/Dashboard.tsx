import React, { useState, useEffect, useMemo } from 'react';
import { Container, Row, Col, Card, Button, Table, Form, Badge, Alert, Spinner } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import { Package } from '../types/package';
import { ApiResponse } from '../types/common';
import AddPackageModal from './AddPackageModal';
import axios from 'axios';
import './Dashboard.css';

const Dashboard: React.FC = () => {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [sortBy, setSortBy] = useState<'date' | 'client' | 'carrier' | 'status'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterClient, setFilterClient] = useState<string>('');
  const [filterCarrier, setFilterCarrier] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  const { user, logout } = useAuth();

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async (): Promise<void> => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get<ApiResponse<{ packages: Package[] }>>('/api/packages', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success && response.data.data && Array.isArray(response.data.data.packages)) {
        setPackages(response.data.data.packages);
      } else {
        console.error('Invalid packages data:', response.data);
        setPackages([]); // Ensure packages is always an array
        setError('Failed to fetch packages - invalid data format');
      }
    } catch (err: any) {
      console.error('Fetch packages error:', err);
      setPackages([]); // Ensure packages is always an array on error
      setError(err.response?.data?.message || 'Failed to fetch packages');
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedPackages = useMemo(() => {
    // Ensure packages is always an array
    if (!Array.isArray(packages)) {
      console.error('Packages is not an array:', packages);
      return [];
    }

    let filtered = packages;

    // Filter by client
    if (filterClient) {
      filtered = filtered.filter(pkg =>
        pkg.customer.toLowerCase().includes(filterClient.toLowerCase())
      );
    }

    // Filter by carrier
    if (filterCarrier) {
      filtered = filtered.filter(pkg =>
        pkg.carrier.toLowerCase() === filterCarrier.toLowerCase()
      );
    }

    // Sort packages
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'date':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'client':
          comparison = a.customer.localeCompare(b.customer);
          break;
        case 'carrier':
          comparison = a.carrier.localeCompare(b.carrier);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return filtered;
  }, [packages, filterClient, filterCarrier, sortBy, sortOrder]);

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
      
      setPackages(packages.filter(pkg => pkg._id !== packageId));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete package');
    }
  };

  if (loading) {
    return (
      <Container className="mt-5 text-center">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      <Row>
        <Col>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h1 className="text-primary">📦 Package Dashboard</h1>
              <p className="text-muted mb-0">Welcome back, {user?.firstName || user?.username}!</p>
            </div>
            <div>
              <Button 
                variant="success" 
                className="me-2"
                onClick={() => setShowAddModal(true)}
              >
                + Add Package
              </Button>
              <Button variant="outline-secondary" onClick={logout}>
                Logout
              </Button>
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
                    <Form.Label>Filter by Carrier</Form.Label>
                    <Form.Select
                      value={filterCarrier}
                      onChange={(e) => setFilterCarrier(e.target.value)}
                      aria-label="Filter by carrier"
                      title="Filter packages by carrier"
                    >
                      <option value="">All Carriers</option>
                      <option value="usps">USPS</option>
                      <option value="fedex">FedEx</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={4} className="d-flex align-items-end">
                  <Button 
                    variant="outline-secondary" 
                    onClick={() => {
                      setFilterClient('');
                      setFilterCarrier('');
                    }}
                  >
                    Clear Filters
                  </Button>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {/* Statistics */}
          <Row className="mb-4">
            <Col md={3}>
              <Card className="text-center">
                <Card.Body>
                  <h3 className="text-primary">{packages.length}</h3>
                  <p className="text-muted mb-0">Total Packages</p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="text-center">
                <Card.Body>
                  <h3 className="text-success">
                    {packages.filter(p => p.status.toLowerCase() === 'delivered').length}
                  </h3>
                  <p className="text-muted mb-0">Delivered</p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="text-center">
                <Card.Body>
                  <h3 className="text-warning">
                    {packages.filter(p => p.status.toLowerCase() === 'in transit').length}
                  </h3>
                  <p className="text-muted mb-0">In Transit</p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="text-center">
                <Card.Body>
                  <h3 className="text-info">
                    {new Set(packages.map(p => p.customer)).size}
                  </h3>
                  <p className="text-muted mb-0">Unique Clients</p>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Packages Table */}
          <Card>
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="mb-0">Package List ({filteredAndSortedPackages.length})</h5>
                <small className="text-muted">
                  Sorted by {sortBy} ({sortOrder === 'asc' ? 'ascending' : 'descending'})
                </small>
              </div>

              {filteredAndSortedPackages.length === 0 ? (
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
                          Date Added {sortBy === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
                        </th>
                        <th 
                          className="sortable-header"
                          onClick={() => handleSort('client')}
                        >
                          Client {sortBy === 'client' && (sortOrder === 'asc' ? '↑' : '↓')}
                        </th>
                        <th>Tracking Number</th>
                        <th 
                          className="sortable-header"
                          onClick={() => handleSort('carrier')}
                        >
                          Carrier {sortBy === 'carrier' && (sortOrder === 'asc' ? '↑' : '↓')}
                        </th>
                        <th 
                          className="sortable-header"
                          onClick={() => handleSort('status')}
                        >
                          Status {sortBy === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
                        </th>
                        <th>Description</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAndSortedPackages.map((pkg) => (
                        <tr key={pkg._id}>
                          <td>{new Date(pkg.createdAt).toLocaleDateString()}</td>
                          <td>
                            <strong>{pkg.customer}</strong>
                            {pkg.notes && (
                              <div className="small text-muted">{pkg.notes.substring(0, 50)}{pkg.notes.length > 50 ? '...' : ''}</div>
                            )}
                          </td>
                          <td>
                            <code
                              className="tracking-number"
                              onClick={() => openTrackingUrl(pkg.trackingNumber, pkg.carrier)}
                              title="Click to track"
                            >
                              {pkg.trackingNumber}
                            </code>
                          </td>
                          <td>
                            <Badge bg={getCarrierBadgeVariant(pkg.carrier)}>
                              {pkg.carrier.toUpperCase()}
                            </Badge>
                          </td>
                          <td>
                            <Badge bg={getStatusBadgeVariant(pkg.status)}>
                              {pkg.status}
                            </Badge>
                          </td>
                          <td>
                            {pkg.notes && (
                              <span className="text-muted">{pkg.notes}</span>
                            )}
                          </td>
                          <td>
                            <Button
                              variant="outline-primary"
                              size="sm"
                              className="me-1"
                              onClick={() => openTrackingUrl(pkg.trackingNumber, pkg.carrier)}
                            >
                              Track
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => deletePackage(pkg._id)}
                            >
                              Delete
                            </Button>
                          </td>
                        </tr>
                      ))}
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
        onPackageAdded={fetchPackages}
      />
    </Container>
  );
};

export default Dashboard;
