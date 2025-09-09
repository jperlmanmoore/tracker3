import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Form, Alert, Spinner } from 'react-bootstrap';
import { ApiResponse } from '../types/common';
import axios from 'axios';
import { FaCog, FaSave, FaArrowLeft } from 'react-icons/fa';

interface PodEmailConfig {
  email1?: string;
  email2?: string;
  enabled: boolean;
}

interface UserSettingsProps {
  onBack?: () => void;
}

const UserSettings: React.FC<UserSettingsProps> = ({ onBack }) => {
  const [podEmailConfig, setPodEmailConfig] = useState<PodEmailConfig>({ enabled: false });
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  useEffect(() => {
    fetchPodEmailConfig();
  }, []);

  const fetchPodEmailConfig = async (): Promise<void> => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get<ApiResponse<PodEmailConfig>>('/api/users/pod-email-config', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setPodEmailConfig(response.data.data || { enabled: false });
      }
    } catch (err: any) {
      console.error('Fetch POD email config error:', err);
      setError('Failed to load POD email configuration');
    } finally {
      setLoading(false);
    }
  };

  const savePodEmailConfig = async (): Promise<void> => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const token = localStorage.getItem('token');
      const response = await axios.put<ApiResponse<PodEmailConfig>>('/api/users/pod-email-config', podEmailConfig, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setSuccess('POD email configuration saved successfully!');
        setPodEmailConfig(response.data.data || { enabled: false });
      }
    } catch (err: any) {
      console.error('Save POD email config error:', err);
      setError(err.response?.data?.message || 'Failed to save POD email configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof PodEmailConfig, value: string | boolean): void => {
    setPodEmailConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading) {
    return (
      <Container className="mt-5 text-center">
        <Card className="p-5 shadow">
          <Spinner animation="border" role="status" className="mb-3">
            <span className="visually-hidden">Loading settings...</span>
          </Spinner>
          <h5 className="text-muted">Loading your settings...</h5>
        </Card>
      </Container>
    );
  }

  return (
    <Container className="mt-4">
      <Row>
        <Col md={8} className="mx-auto">
          <Card className="shadow">
            <Card.Header className="bg-primary text-white">
              <div className="d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center">
                  {FaCog({className: "me-2"})}
                  <h5 className="mb-0">User Settings</h5>
                </div>
                {onBack && (
                  <Button
                    variant="outline-light"
                    size="sm"
                    onClick={onBack}
                    className="d-flex align-items-center gap-1"
                  >
                    {FaArrowLeft({size: 12})}
                    Back to Dashboard
                  </Button>
                )}
              </div>
            </Card.Header>
            <Card.Body>
              <h6 className="mb-3">Proof of Delivery Email Notifications</h6>
              <p className="text-muted small mb-4">
                Configure email addresses to receive automatic notifications when packages are delivered.
                You can set up to 2 email addresses for POD notifications.
              </p>

              {error && <Alert variant="danger" className="mb-3">{error}</Alert>}
              {success && <Alert variant="success" className="mb-3">{success}</Alert>}

              <Form>
                <Form.Group className="mb-3">
                  <Form.Check
                    type="switch"
                    id="pod-email-enabled"
                    label="Enable POD Email Notifications"
                    checked={podEmailConfig.enabled}
                    onChange={(e) => handleInputChange('enabled', e.target.checked)}
                  />
                  <Form.Text className="text-muted">
                    When enabled, you'll receive email notifications whenever packages are marked as delivered.
                  </Form.Text>
                </Form.Group>

                {podEmailConfig.enabled && (
                  <>
                    <Form.Group className="mb-3">
                      <Form.Label>Primary Email Address</Form.Label>
                      <Form.Control
                        type="email"
                        placeholder="Enter primary email address"
                        value={podEmailConfig.email1 || ''}
                        onChange={(e) => handleInputChange('email1', e.target.value)}
                      />
                      <Form.Text className="text-muted">
                        This email will receive POD notifications for all delivered packages.
                      </Form.Text>
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>Secondary Email Address (Optional)</Form.Label>
                      <Form.Control
                        type="email"
                        placeholder="Enter secondary email address"
                        value={podEmailConfig.email2 || ''}
                        onChange={(e) => handleInputChange('email2', e.target.value)}
                      />
                      <Form.Text className="text-muted">
                        Optional second email address for POD notifications.
                      </Form.Text>
                    </Form.Group>
                  </>
                )}

                <div className="d-flex gap-2">
                  <Button
                    variant="primary"
                    onClick={savePodEmailConfig}
                    disabled={saving}
                    className="d-flex align-items-center gap-2"
                  >
                    {saving ? (
                      <Spinner animation="border" size="sm" />
                    ) : (
                      FaSave({})
                    )}
                    {saving ? 'Saving...' : 'Save Settings'}
                  </Button>
                  <Button
                    variant="outline-secondary"
                    onClick={fetchPodEmailConfig}
                    disabled={loading}
                  >
                    Reset
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default UserSettings;
