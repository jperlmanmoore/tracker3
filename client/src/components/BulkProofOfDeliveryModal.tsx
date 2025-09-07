import React, { useState } from 'react';
import { Modal, Button, Table, Badge, Alert, Spinner } from 'react-bootstrap';
import { ProofOfDelivery } from '../types/package';
import axios from 'axios';

interface BulkProofOfDeliveryModalProps {
  show: boolean;
  onHide: () => void;
  customer: string;
  packages: Array<{
    trackingNumber: string;
    carrier: string;
    status: string;
    deliveryDate?: string;
  }>;
}

interface BulkProofData {
  trackingNumber: string;
  customer: string;
  carrier: string;
  status: string;
  deliveryDate?: string;
  hasProofOfDelivery: boolean;
  proofOfDelivery?: ProofOfDelivery | null;
}

const BulkProofOfDeliveryModal: React.FC<BulkProofOfDeliveryModalProps> = ({
  show,
  onHide,
  customer,
  packages
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [proofData, setProofData] = useState<BulkProofData[]>([]);

  const fetchBulkProofOfDelivery = async (): Promise<void> => {
    const deliveredPackages = packages.filter(pkg => 
      pkg.status && pkg.status.toLowerCase() === 'delivered'
    );

    if (deliveredPackages.length === 0) {
      setError('No delivered packages found for this customer');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const token = localStorage.getItem('token');
      const trackingNumbers = deliveredPackages.map(pkg => pkg.trackingNumber);
      
      const response = await axios.post('/api/packages/proof-of-delivery/batch', {
        trackingNumbers
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setProofData(response.data.data);
      } else {
        setError(response.data.message || 'Failed to fetch bulk proof of delivery');
      }
    } catch (err: any) {
      console.error('Fetch bulk proof of delivery error:', err);
      setError(err.response?.data?.message || 'Failed to fetch bulk proof of delivery');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (show) {
      fetchBulkProofOfDelivery();
    }
  }, [show]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClose = (): void => {
    setProofData([]);
    setError('');
    onHide();
  };

  const openCarrierUrl = (url: string): void => {
    if (url) {
      window.open(url, '_blank');
    }
  };

  const getStatusBadgeVariant = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'delivered':
        return 'success';
      case 'in transit':
        return 'primary';
      case 'out for delivery':
        return 'warning';
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

  return (
    <Modal show={show} onHide={handleClose} size="xl" centered>
      <Modal.Header closeButton>
        <Modal.Title>
          📋 Bulk Proof of Delivery - {customer}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError('')}>
            {error}
          </Alert>
        )}
        
        {loading ? (
          <div className="text-center py-4">
            <Spinner animation="border" role="status">
              <span className="visually-hidden">Loading...</span>
            </Spinner>
            <p className="mt-2">Fetching proof of delivery data...</p>
          </div>
        ) : (
          <div>
            {proofData.length === 0 && !error && (
              <Alert variant="info">
                No delivered packages found for {customer}.
              </Alert>
            )}
            
            {proofData.length > 0 && (
              <div>
                <p className="mb-3">
                  <strong>Found {proofData.length} delivered package(s) for {customer}</strong>
                </p>
                
                <Table striped bordered hover responsive>
                  <thead>
                    <tr>
                      <th>Tracking Number</th>
                      <th>Carrier</th>
                      <th>Status</th>
                      <th>Delivery Date</th>
                      <th>Delivered To</th>
                      <th>Location</th>
                      <th>Signature</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {proofData.map((pkg, index) => (
                      <tr key={index}>
                        <td>{pkg.trackingNumber}</td>
                        <td>
                          <Badge bg={getCarrierBadgeVariant(pkg.carrier)}>
                            {pkg.carrier}
                          </Badge>
                        </td>
                        <td>
                          <Badge bg={getStatusBadgeVariant(pkg.status)}>
                            {pkg.status}
                          </Badge>
                        </td>
                        <td>
                          {pkg.deliveryDate 
                            ? new Date(pkg.deliveryDate).toLocaleDateString()
                            : '-'
                          }
                        </td>
                        <td>{pkg.proofOfDelivery?.deliveredTo || '-'}</td>
                        <td>{pkg.proofOfDelivery?.deliveryLocation || '-'}</td>
                        <td>
                          {pkg.proofOfDelivery?.signatureRequired ? (
                            <Badge bg={pkg.proofOfDelivery.signatureObtained ? 'success' : 'warning'}>
                              {pkg.proofOfDelivery.signatureObtained 
                                ? `✓ ${pkg.proofOfDelivery.signedBy || 'Signed'}`
                                : 'Required'
                              }
                            </Badge>
                          ) : (
                            <Badge bg="secondary">Not Required</Badge>
                          )}
                        </td>
                        <td>
                          {pkg.proofOfDelivery?.proofOfDeliveryUrl && (
                            <Button 
                              variant="outline-primary" 
                              size="sm"
                              onClick={() => openCarrierUrl(pkg.proofOfDelivery!.proofOfDeliveryUrl!)}
                            >
                              View POD
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
                
                <div className="mt-3">
                  <small className="text-muted">
                    POD = Proof of Delivery. Click "View POD" to see detailed delivery information on the carrier's website.
                  </small>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          Close
        </Button>
        {proofData.length > 0 && (
          <Button 
            variant="outline-primary"
            onClick={() => {
              const urlsToOpen = proofData
                .filter(pkg => pkg.proofOfDelivery?.proofOfDeliveryUrl)
                .map(pkg => pkg.proofOfDelivery!.proofOfDeliveryUrl!);
              
              urlsToOpen.forEach(url => window.open(url, '_blank'));
            }}
          >
            Open All POD Links ({proofData.filter(pkg => pkg.proofOfDelivery?.proofOfDeliveryUrl).length})
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
};

export default BulkProofOfDeliveryModal;
