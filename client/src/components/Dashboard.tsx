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
  const getAllPackages = (groupedPackages: any[]): any[] => {
    if (!Array.isArray(groupedPackages)) {
      return [];
    }
    
    const allPackages: any[] = [];
    groupedPackages.forEach(group => {
      if (group.packages && Array.isArray(group.packages)) {
        group.packages.forEach((pkg: any) => {
          allPackages.push({
            ...pkg,
            customer: group._id // Add customer name from group
          });
        });
      }
    });
    
    return allPackages;
  };

  const filteredAndSortedPackages = useMemo(() => {
    // Get all individual packages from grouped data
    const allPackages = getAllPackages(packages);
    
    let filtered = allPackages;

    // Filter by client
    if (filterClient) {
      filtered = filtered.filter(pkg =>
        pkg.customer && pkg.customer.toLowerCase().includes(filterClient.toLowerCase())
      );
    }

    // Filter by carrier
    if (filterCarrier) {
      filtered = filtered.filter(pkg =>
        pkg.carrier && pkg.carrier.toLowerCase() === filterCarrier.toLowerCase()
      );
    }

    // Sort packages
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'date':
          comparison = new Date(a.dateSent || a.createdAt || 0).getTime() - new Date(b.dateSent || b.createdAt || 0).getTime();
          break;
        case 'client':
          comparison = (a.customer || '').localeCompare(b.customer || '');
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

  const renderGroupedPackages = () => {
    if (!Array.isArray(packages) || packages.length === 0) {
      return <tr><td colSpan={7}>No packages found</td></tr>;
    }

    return packages.map((group: any) => {
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
            <td colSpan={7} className="client-row bg-light">
              <strong>📁 {group._id}</strong> ({group.packages?.length || 0} packages)
            </td>
          </tr>
          {group.packages?.map((pkg: any, index: number) => (
            <tr key={index}>
              <td>{new Date(pkg.dateSent || pkg.createdAt || Date.now()).toLocaleDateString()}</td>
              <td>{group._id}</td>
              <td>
                <a 
                  href="#" 
                  onClick={(e) => {
                    e.preventDefault();
                    openTrackingUrl(pkg.trackingNumber, pkg.carrier);
                  }}
                  className="text-primary"
                >
                  {pkg.trackingNumber}
                </a>
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
              <td>{pkg.notes || '-'}</td>
              <td>
                {index === 0 && (
                  <div className="d-flex flex-column gap-1">
                    {carriers.map(carrier => {
                      const carrierPackages = packagesByCarrier[carrier];
                      if (carrierPackages.length === 1) {
                        return (
                          <Button 
                            key={carrier}
                            variant="outline-primary" 
                            size="sm"
                            onClick={() => openTrackingUrl(carrierPackages[0].trackingNumber, carrier)}
                          >
                            Track {carrier}
                          </Button>
                        );
                      } else {
                        // Multiple packages for this carrier - create bulk tracking URL
                        const trackingNumbers = carrierPackages.map((p: any) => p.trackingNumber);
                        const bulkUrl = carrier.toLowerCase() === 'usps' 
                          ? `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumbers.join(',')}`
                          : `https://www.fedex.com/fedextrack/?trknbr=${trackingNumbers.join(',')}`;
                        
                        return (
                          <Button 
                            key={carrier}
                            variant="outline-primary" 
                            size="sm"
                            onClick={() => window.open(bulkUrl, '_blank')}
                          >
                            Track All {carrier} ({carrierPackages.length})
                          </Button>
                        );
                      }
                    })}
                  </div>
                )}
              </td>
            </tr>
          ))}
        </React.Fragment>
      );
    });
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
                    <label htmlFor="filter-select">Filter Options</label>
                    <Form.Select
                      id="filter-select"
                      value={filterCarrier}
                      onChange={(e) => setFilterCarrier(e.target.value)}
                      aria-label="Filter by carrier"
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
                  <h3 className="text-primary">{getAllPackages(packages).length}</h3>
                  <p className="text-muted mb-0">Total Packages</p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="text-center">
                <Card.Body>
                  <h3 className="text-success">
                    {getAllPackages(packages).filter(p => p.status && p.status.toLowerCase() === 'delivered').length}
                  </h3>
                  <p className="text-muted mb-0">Delivered</p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="text-center">
                <Card.Body>
                  <h3 className="text-warning">
                    {getAllPackages(packages).filter(p => p.status && p.status.toLowerCase() === 'in transit').length}
                  </h3>
                  <p className="text-muted mb-0">In Transit</p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="text-center">
                <Card.Body>
                  <h3 className="text-info">
                    {packages.length}
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
                      {renderGroupedPackages()}
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
    </Container>
  );
};

export default Dashboard;
