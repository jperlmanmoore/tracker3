import React, { useState } from 'react';
import { Modal, Button, Alert, Spinner } from 'react-bootstrap';
import axios from 'axios';

interface DeleteCustomerModalProps {
  show: boolean;
  onHide: () => void;
  customerName: string;
  packageCount: number;
  onCustomerDeleted: () => void;
}

const DeleteCustomerModal: React.FC<DeleteCustomerModalProps> = ({
  show,
  onHide,
  customerName,
  packageCount,
  onCustomerDeleted
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [confirmText, setConfirmText] = useState<string>('');

  const handleClose = (): void => {
    setError('');
    setConfirmText('');
    onHide();
  };

  const handleDelete = async (): Promise<void> => {
    if (confirmText !== customerName) {
      setError('Customer name does not match. Please type the exact customer name to confirm deletion.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('token');
      const encodedCustomerName = encodeURIComponent(customerName);
      const response = await axios.delete(`/api/packages/customer/${encodedCustomerName}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        onCustomerDeleted();
        handleClose();
      } else {
        setError(response.data.message || 'Failed to delete customer packages');
      }
    } catch (err: any) {
      console.error('Delete customer error:', err);
      setError(err.response?.data?.message || 'Failed to delete customer packages');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={handleClose} centered>
      <Modal.Header closeButton className="bg-danger text-white">
        <Modal.Title>
          ⚠️ Delete Customer and All Packages
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <div className="mb-4">
          <h5 className="text-danger">⚠️ WARNING: This action cannot be undone!</h5>
          <p>
            You are about to delete the customer <strong>"{customerName}"</strong> and all{' '}
            <strong>{packageCount}</strong> associated package(s).
          </p>
          <p>This will permanently remove:</p>
          <ul>
            <li>All tracking numbers for this customer</li>
            <li>All package history and notes</li>
            <li>All delivery information and proof of delivery data</li>
          </ul>
        </div>

        <div className="mb-3">
          <label htmlFor="confirm-input" className="form-label">
            <strong>To confirm deletion, type the customer name exactly as shown:</strong>
          </label>
          <div className="bg-light p-2 mb-2 rounded">
            <code>{customerName}</code>
          </div>
          <input
            id="confirm-input"
            type="text"
            className="form-control"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="Type customer name here..."
            disabled={loading}
          />
        </div>

        <div className="text-muted">
          <small>
            <strong>Note:</strong> This will only delete packages for your account. Other users' packages are not affected.
          </small>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button 
          variant="danger" 
          onClick={handleDelete} 
          disabled={loading || confirmText !== customerName}
        >
          {loading ? (
            <>
              <Spinner animation="border" size="sm" className="me-2" />
              Deleting...
            </>
          ) : (
            `🗑️ Delete ${customerName} (${packageCount} packages)`
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default DeleteCustomerModal;
