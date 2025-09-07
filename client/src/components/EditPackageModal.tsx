import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Alert, Spinner } from 'react-bootstrap';
import { Package } from '../types/package';
import axios from 'axios';

interface EditPackageModalProps {
  show: boolean;
  onHide: () => void;
  package: Package | null;
  onPackageUpdated: () => void;
}

const EditPackageModal: React.FC<EditPackageModalProps> = ({
  show,
  onHide,
  package: pkg,
  onPackageUpdated
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [formData, setFormData] = useState({
    trackingNumber: '',
    customer: '',
    packageType: 'LOR' as 'LOR' | 'demand' | 'spol' | 'AL' | 'other',
    dateSent: '',
    notes: ''
  });

  useEffect(() => {
    if (pkg && show) {
      setFormData({
        trackingNumber: pkg.trackingNumber || '',
        customer: pkg.customer || '',
        packageType: pkg.packageType || 'LOR',
        dateSent: pkg.dateSent ? new Date(pkg.dateSent).toISOString().split('T')[0] : '',
        notes: pkg.notes || ''
      });
    }
  }, [pkg, show]);

  const handleClose = (): void => {
    setError('');
    setFormData({
      trackingNumber: '',
      customer: '',
      packageType: 'LOR',
      dateSent: '',
      notes: ''
    });
    onHide();
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    
    if (!pkg) return;

    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('token');
      const response = await axios.put(`/api/packages/${pkg._id}`, {
        customer: formData.customer,
        packageType: formData.packageType,
        dateSent: formData.dateSent,
        notes: formData.notes
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        onPackageUpdated();
        handleClose();
      } else {
        setError(response.data.message || 'Failed to update package');
      }
    } catch (err: any) {
      console.error('Update package error:', err);
      setError(err.response?.data?.message || 'Failed to update package');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!pkg || !window.confirm('Are you sure you want to delete this package? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('token');
      const response = await axios.delete(`/api/packages/${pkg._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        onPackageUpdated();
        handleClose();
      } else {
        setError(response.data.message || 'Failed to delete package');
      }
    } catch (err: any) {
      console.error('Delete package error:', err);
      setError(err.response?.data?.message || 'Failed to delete package');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={handleClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>
          ✏️ Edit Package
          {pkg && (
            <small className="text-muted ms-2">({pkg.trackingNumber})</small>
          )}
        </Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          {error && (
            <Alert variant="danger" dismissible onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          <Form.Group className="mb-3">
            <Form.Label>Tracking Number</Form.Label>
            <Form.Control
              type="text"
              value={formData.trackingNumber}
              disabled
              className="bg-light"
            />
            <Form.Text className="text-muted">
              Tracking number cannot be modified
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Customer Name *</Form.Label>
            <Form.Control
              type="text"
              value={formData.customer}
              onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
              required
              disabled={loading}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Package Type *</Form.Label>
            <Form.Select
              value={formData.packageType}
              onChange={(e) => setFormData({ ...formData, packageType: e.target.value as any })}
              required
              disabled={loading}
            >
              <option value="LOR">LOR</option>
              <option value="demand">Demand</option>
              <option value="spol">SPOL</option>
              <option value="AL">AL</option>
              <option value="other">Other</option>
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Date Sent *</Form.Label>
            <Form.Control
              type="date"
              value={formData.dateSent}
              onChange={(e) => setFormData({ ...formData, dateSent: e.target.value })}
              required
              disabled={loading}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Notes</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Optional notes about this package..."
              disabled={loading}
            />
          </Form.Group>

          {pkg?.status && (
            <div className="mb-3">
              <strong>Current Status:</strong>{' '}
              <span className={`badge ${
                pkg.status.toLowerCase() === 'delivered' ? 'bg-success' :
                pkg.status.toLowerCase() === 'in transit' ? 'bg-primary' :
                pkg.status.toLowerCase() === 'out for delivery' ? 'bg-warning' :
                'bg-secondary'
              }`}>
                {pkg.status}
              </span>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="danger" onClick={handleDelete} disabled={loading}>
            {loading ? <Spinner animation="border" size="sm" /> : '🗑️ Delete Package'}
          </Button>
          <Button variant="secondary" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? <Spinner animation="border" size="sm" /> : '💾 Save Changes'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default EditPackageModal;
