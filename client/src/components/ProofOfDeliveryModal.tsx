import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Button, Card, Row, Col, Badge, Spinner, Alert, Image } from 'react-bootstrap';
import { ProofOfDelivery } from '../types/package';
import axios from 'axios';

interface ProofOfDeliveryModalProps {
  show: boolean;
  onHide: () => void;
  packageId?: string;
  trackingNumber?: string;
  customer?: string;
  carrier?: string;
}

interface ProofOfDeliveryResponse {
  packageInfo: {
    trackingNumber: string;
    customer: string;
    carrier: string;
    status: string;
    deliveryDate?: string;
  };
  proofOfDelivery: ProofOfDelivery | null;
  message?: string;
}

const ProofOfDeliveryModal: React.FC<ProofOfDeliveryModalProps> = ({
  show,
  onHide,
  packageId,
  trackingNumber,
  customer,
  carrier
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [proofData, setProofData] = useState<ProofOfDeliveryResponse | null>(null);

  const fetchProofOfDelivery = useCallback(async (): Promise<void> => {
    if (!packageId) return;

    try {
      setLoading(true);
      setError('');
      
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/packages/${packageId}/proof-of-delivery`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setProofData(response.data.data);
      } else {
        setError(response.data.message || 'Failed to fetch proof of delivery');
      }
    } catch (err: any) {
      console.error('Fetch proof of delivery error:', err);
      setError(err.response?.data?.message || 'Failed to fetch proof of delivery');
    } finally {
      setLoading(false);
    }
  }, [packageId]);

  useEffect(() => {
    if (show && packageId) {
      fetchProofOfDelivery();
    }
  }, [show, packageId, fetchProofOfDelivery]);

  const handleClose = (): void => {
    setProofData(null);
    setError('');
    onHide();
  };

  const openCarrierUrl = (url: string): void => {
    if (url) {
      window.open(url, '_blank');
    }
  };

  const renderProofOfDelivery = (): React.ReactElement => {
    if (!proofData?.proofOfDelivery) {
      return (
        <Alert variant="info">
          <Alert.Heading>No Proof of Delivery Available</Alert.Heading>
          <p>{proofData?.message || 'Proof of delivery information is not available for this package.'}</p>
          {proofData?.packageInfo?.status !== 'Delivered' && (
            <p><strong>Status:</strong> {proofData?.packageInfo?.status}</p>
          )}
        </Alert>
      );
    }

    const pod = proofData.proofOfDelivery;
    const packageInfo = proofData.packageInfo;

    return (
      <div>
        {/* Package Information */}
        <Card className="mb-3">
          <Card.Header>
            <strong>📦 Package Information</strong>
          </Card.Header>
          <Card.Body>
            <Row>
              <Col md={6}>
                <p><strong>Tracking Number:</strong> {packageInfo.trackingNumber}</p>
                <p><strong>Customer:</strong> {packageInfo.customer}</p>
              </Col>
              <Col md={6}>
                <p><strong>Carrier:</strong> 
                  <Badge bg={packageInfo.carrier === 'USPS' ? 'info' : 'dark'} className="ms-2">
                    {packageInfo.carrier}
                  </Badge>
                </p>
                <p><strong>Status:</strong> 
                  <Badge bg="success" className="ms-2">{packageInfo.status}</Badge>
                </p>
                {packageInfo.deliveryDate && (
                  <p><strong>Delivery Date:</strong> {new Date(packageInfo.deliveryDate).toLocaleDateString()}</p>
                )}
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* Delivery Information */}
        <Card className="mb-3">
          <Card.Header>
            <strong>🚚 Delivery Information</strong>
          </Card.Header>
          <Card.Body>
            <Row>
              <Col md={6}>
                {pod.deliveredTo && (
                  <p><strong>Delivered To:</strong> {pod.deliveredTo}</p>
                )}
                {pod.deliveryLocation && (
                  <p><strong>Delivery Location:</strong> {pod.deliveryLocation}</p>
                )}
                {pod.deliveryInstructions && (
                  <p><strong>Instructions:</strong> {pod.deliveryInstructions}</p>
                )}
              </Col>
              <Col md={6}>
                <p><strong>Signature Required:</strong> 
                  <Badge bg={pod.signatureRequired ? 'warning' : 'secondary'} className="ms-2">
                    {pod.signatureRequired ? 'Yes' : 'No'}
                  </Badge>
                </p>
                {pod.signatureRequired && (
                  <p><strong>Signature Obtained:</strong> 
                    <Badge bg={pod.signatureObtained ? 'success' : 'danger'} className="ms-2">
                      {pod.signatureObtained ? 'Yes' : 'No'}
                    </Badge>
                  </p>
                )}
                {pod.signedBy && (
                  <p><strong>Signed By:</strong> {pod.signedBy}</p>
                )}
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* Proof Documentation */}
        {(pod.deliveryPhoto || pod.proofOfDeliveryUrl) && (
          <Card className="mb-3">
            <Card.Header>
              <strong>📸 Proof Documentation</strong>
            </Card.Header>
            <Card.Body>
              {pod.deliveryPhoto && (
                <div className="mb-3">
                  <p><strong>Delivery Photo:</strong></p>
                  <Image 
                    src={pod.deliveryPhoto} 
                    alt="Delivery Photo" 
                    thumbnail 
                    style={{ maxWidth: '300px', maxHeight: '200px' }}
                  />
                </div>
              )}
              {pod.proofOfDeliveryUrl && (
                <div>
                  <Button 
                    variant="outline-primary" 
                    onClick={() => openCarrierUrl(pod.proofOfDeliveryUrl!)}
                  >
                    <i className="fas fa-external-link-alt me-2"></i>
                    View Official Proof of Delivery
                  </Button>
                </div>
              )}
            </Card.Body>
          </Card>
        )}

        {/* Last Updated */}
        {pod.lastUpdated && (
          <div className="text-muted text-end">
            <small>Last updated: {new Date(pod.lastUpdated).toLocaleString()}</small>
          </div>
        )}
      </div>
    );
  };

  return (
    <Modal show={show} onHide={handleClose} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>
          🔍 Proof of Delivery
          {trackingNumber && (
            <small className="text-muted ms-2">({trackingNumber})</small>
          )}
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
            <p className="mt-2">Fetching proof of delivery...</p>
          </div>
        ) : (
          renderProofOfDelivery()
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          Close
        </Button>
        {proofData?.proofOfDelivery?.proofOfDeliveryUrl && (
          <Button 
            variant="primary" 
            onClick={() => openCarrierUrl(proofData.proofOfDelivery!.proofOfDeliveryUrl!)}
          >
            View on {carrier || 'Carrier'} Website
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
};

export default ProofOfDeliveryModal;
