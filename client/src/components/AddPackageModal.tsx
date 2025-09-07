import React, { useState, FormEvent } from 'react';
import { Modal, Form, Button, Alert, Row, Col } from 'react-bootstrap';
import { PackageCreateData } from '../types/package';
import { ApiResponse } from '../types/common';
import axios from 'axios';

interface AddPackageModalProps {
  show: boolean;
  onHide: () => void;
  onPackageAdded: () => void;
}

const AddPackageModal: React.FC<AddPackageModalProps> = ({ show, onHide, onPackageAdded }) => {
  const [formData, setFormData] = useState<PackageCreateData>({
    trackingNumbers: '',
    customer: '',
    packageType: 'LOR',
    dateSent: new Date().toISOString().split('T')[0],
    notes: ''
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // Remove unused user import

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post<ApiResponse<any>>('/api/packages', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setSuccess('Package(s) added successfully!');
        setTimeout(() => {
          onPackageAdded();
          onHide();
          resetForm();
        }, 1500);
      } else {
        setError(response.data.message || 'Failed to add package');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add package');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = (): void => {
    setFormData({
      trackingNumbers: '',
      customer: '',
      packageType: 'LOR',
      dateSent: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setError('');
    setSuccess('');
  };

  const handleClose = (): void => {
    resetForm();
    onHide();
  };

  const detectCarriers = (trackingNumbers: string): string => {
    const numbers = trackingNumbers.split(/[,\n\r\t ]+/).filter(num => num.trim());
    const carriers = new Set<string>();
    
    numbers.forEach(num => {
      const cleanNum = num.trim().toUpperCase();
      
      // USPS patterns
      if (/^(94|92|93|82|03|70|90|91|95)\d{20}$/.test(cleanNum) ||
          /^[A-Z]{2}\d{9}US$/.test(cleanNum) ||
          /^(\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{2})$/.test(cleanNum.replace(/\s/g, ''))) {
        carriers.add('USPS');
      }
      // FedEx patterns
      else if (/^\d{12}$/.test(cleanNum) ||
               /^\d{14}$/.test(cleanNum) ||
               /^\d{15}$/.test(cleanNum) ||
               /^\d{20}$/.test(cleanNum)) {
        carriers.add('FedEx');
      }
    });

    return Array.from(carriers).join(', ') || 'Unknown';
  };

  return (
    <Modal show={show} onHide={handleClose} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Add New Package(s)</Modal.Title>
      </Modal.Header>
      
      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}
        {success && <Alert variant="success">{success}</Alert>}

        <Form onSubmit={handleSubmit} id="packageForm">
          <Row>
            <Col md={8}>
              <Form.Group className="mb-3">
                <Form.Label>Customer Name *</Form.Label>
                <Form.Control
                  type="text"
                  value={formData.customer}
                  onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
                  required
                  placeholder="Enter customer name"
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Package Type *</Form.Label>
                <Form.Select
                  id="package-select"
                  value={formData.packageType}
                  onChange={(e) => setFormData({ ...formData, packageType: e.target.value as any })}
                  required
                  aria-label="Package type"
                  title="Select package type"
                >
                  <option value="LOR">LOR</option>
                  <option value="demand">Demand</option>
                  <option value="spol">SPOL</option>
                  <option value="AL">AL</option>
                  <option value="other">Other</option>
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>

          <Form.Group className="mb-3">
            <Form.Label>Tracking Numbers *</Form.Label>
            <Form.Control
              as="textarea"
              rows={4}
              value={formData.trackingNumbers}
              onChange={(e) => setFormData({ ...formData, trackingNumbers: e.target.value })}
              required
              placeholder="Enter tracking numbers (one per line or comma separated)&#10;Example:&#10;9405511206213334271430&#10;1234567890123456"
            />
            <Form.Text className="text-muted">
              Enter multiple tracking numbers separated by commas or new lines. 
              {formData.trackingNumbers && (
                <><br />Detected carriers: <strong>{detectCarriers(formData.trackingNumbers)}</strong></>
              )}
            </Form.Text>
          </Form.Group>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Date Sent *</Form.Label>
                <Form.Control
                  type="date"
                  value={formData.dateSent}
                  onChange={(e) => setFormData({ ...formData, dateSent: e.target.value })}
                  required
                  max={new Date().toISOString().split('T')[0]}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Notes</Form.Label>
                <Form.Control
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Optional notes"
                  maxLength={500}
                />
                <Form.Text className="text-muted">
                  {(formData.notes || '').length}/500 characters
                </Form.Text>
              </Form.Group>
            </Col>
          </Row>
        </Form>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button variant="primary" type="submit" disabled={loading} form="packageForm">
          {loading ? 'Adding...' : 'Add Package(s)'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default AddPackageModal;
