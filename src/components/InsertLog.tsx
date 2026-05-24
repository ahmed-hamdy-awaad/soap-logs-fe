import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Send, Sparkles, CheckCircle2, AlertTriangle, Code } from 'lucide-react';

interface MockPayload {
  serviceName: string;
  operationName: string;
  requestXml: string;
  responseXml: string;
  httpStatusCode: number;
  executionTimeMs: number;
  errorMessage: string | null;
  status: string;
  tags: string;
  notes: string;
}

export const InsertLog: React.FC = () => {
  const { user, apiFetch } = useAuth();
  const [selectedService, setSelectedService] = useState<'Payment' | 'Order' | 'User' | 'Email' | 'Inventory'>('Payment');
  const [outcome, setOutcome] = useState<'success' | 'failure'>('success');
  const [currentMock, setCurrentMock] = useState<MockPayload | null>(null);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // XML prettifier for preview
  const formatXml = (xmlStr: string) => {
    try {
      let formatted = '';
      let reg = /(>)(<)(\/*)/g;
      let xml = xmlStr.replace(reg, '$1\r\n$2$3');
      let pad = 0;
      xml.split('\r\n').forEach(node => {
        let indent = 0;
        if (node.match(/.+<\/\w[^>]*>$/)) {
          indent = 0;
        } else if (node.match(/^<\/\w/)) {
          if (pad !== 0) pad -= 1;
        } else if (node.match(/^<\w([^>]*[^\/])?>.*$/)) {
          indent = 1;
        } else {
          indent = 0;
        }

        let padding = '';
        for (let i = 0; i < pad; i++) {
          padding += '  ';
        }

        formatted += padding + node + '\r\n';
        pad += indent;
      });
      return formatted.trim();
    } catch {
      return xmlStr;
    }
  };

  const generateMockPayload = () => {
    const isSuccess = outcome === 'success';
    const executionTimeMs = isSuccess ? Math.floor(Math.random() * 200) + 40 : Math.floor(Math.random() * 1200) + 200;
    const httpStatusCode = isSuccess ? 200 : (Math.random() > 0.5 ? 500 : 400);
    const trackingStatus = isSuccess ? 'Resolved' : ['Pending', 'Investigating', 'Ignored'][Math.floor(Math.random() * 3)];
    const token = 'tkn_' + Math.random().toString(36).substring(2, 15);

    let serviceName = '';
    let operationName = '';
    let requestXml = '';
    let responseXml = '';
    let errorMessage: string | null = null;
    let tags = '';
    let notes = '';

    if (selectedService === 'Payment') {
      serviceName = 'PaymentService';
      operationName = 'ProcessPayment';
      tags = isSuccess ? 'Billing,Visa' : 'Billing,Error,Critical';
      notes = isSuccess ? 'Payment settled successfully.' : 'Payment declined by aggregator.';
      
      const cardNumber = isSuccess ? '4111********1111' : '4111********ERR';
      const amount = (Math.random() * 800 + 10).toFixed(2);
      
      requestXml = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:pay="http://example.com/payment">
   <soapenv:Header>
      <pay:AuthHeader>
         <pay:Token>${token}</pay:Token>
      </pay:AuthHeader>
   </soapenv:Header>
   <soapenv:Body>
      <pay:ProcessPaymentRequest>
         <pay:CardNumber>${cardNumber}</pay:CardNumber>
         <pay:Amount>${amount}</pay:Amount>
         <pay:Currency>USD</pay:Currency>
      </pay:ProcessPaymentRequest>
   </soapenv:Body>
</soapenv:Envelope>`;

      if (isSuccess) {
        responseXml = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:pay="http://example.com/payment">
   <soapenv:Body>
      <pay:ProcessPaymentResponse>
         <pay:TransactionID>TXN-${Math.floor(Math.random() * 1000000)}</pay:TransactionID>
         <pay:Status>SUCCESS</pay:Status>
         <pay:ApprovalCode>AP-${Math.floor(Math.random() * 9000) + 1000}</pay:ApprovalCode>
      </pay:ProcessPaymentResponse>
   </soapenv:Body>
</soapenv:Envelope>`;
      } else {
        errorMessage = 'Declined. The card details provided are invalid or expired.';
        responseXml = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
   <soapenv:Body>
      <soapenv:Fault>
         <faultcode>soapenv:Client</faultcode>
         <faultstring>${errorMessage}</faultstring>
         <detail>
            <errorCode>ERR-PAY-4001</errorCode>
         </detail>
      </soapenv:Fault>
   </soapenv:Body>
</soapenv:Envelope>`;
      }
    } else if (selectedService === 'Order') {
      serviceName = 'OrderService';
      operationName = 'CreateOrder';
      tags = isSuccess ? 'Sales' : 'Sales,Database';
      notes = isSuccess ? 'Order created successfully.' : 'Order persistence failed due to SQL deadlock.';

      requestXml = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ord="http://example.com/orders">
   <soapenv:Body>
      <ord:CreateOrderRequest>
         <ord:CustomerID>CUST-${Math.floor(Math.random() * 8000) + 1000}</ord:CustomerID>
         <ord:Items>
            <ord:Item>
               <ord:SKU>SKU-${Math.floor(Math.random() * 900) + 100}</ord:SKU>
               <ord:Quantity>${Math.floor(Math.random() * 5) + 1}</ord:Quantity>
            </ord:Item>
         </ord:Items>
      </ord:CreateOrderRequest>
   </soapenv:Body>
</soapenv:Envelope>`;

      if (isSuccess) {
        responseXml = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ord="http://example.com/orders">
   <soapenv:Body>
      <ord:CreateOrderResponse>
         <ord:OrderID>${Math.random().toString(36).substring(2, 10).toUpperCase()}</ord:OrderID>
         <ord:Status>CONFIRMED</ord:Status>
      </ord:CreateOrderResponse>
   </soapenv:Body>
</soapenv:Envelope>`;
      } else {
        errorMessage = 'Database deadlock error occurred while committing the SQL transaction.';
        responseXml = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
   <soapenv:Body>
      <soapenv:Fault>
         <faultcode>soapenv:Server</faultcode>
         <faultstring>${errorMessage}</faultstring>
         <detail>
            <sqlErrorCode>1205</sqlErrorCode>
         </detail>
      </soapenv:Fault>
   </soapenv:Body>
</soapenv:Envelope>`;
      }
    } else if (selectedService === 'User') {
      serviceName = 'UserService';
      operationName = 'AuthenticateUser';
      tags = isSuccess ? 'Security' : 'Security,AuthFailure';
      notes = isSuccess ? 'User authenticated successfully.' : 'User authentication failed (invalid credentials).';

      requestXml = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:usr="http://example.com/users">
   <soapenv:Body>
      <usr:AuthenticateUserRequest>
         <usr:Username>sim_operator_${Math.floor(Math.random() * 100)}</usr:Username>
         <usr:Password>********</usr:Password>
      </usr:AuthenticateUserRequest>
   </soapenv:Body>
</soapenv:Envelope>`;

      if (isSuccess) {
        responseXml = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:usr="http://example.com/users">
   <soapenv:Body>
      <usr:AuthenticateUserResponse>
         <usr:SessionID>sess_${Math.random().toString(36).substring(2, 15)}</usr:SessionID>
         <usr:Authorized>true</usr:Authorized>
      </usr:AuthenticateUserResponse>
   </soapenv:Body>
</soapenv:Envelope>`;
      } else {
        errorMessage = 'Unauthorized access. Username or password does not match.';
        responseXml = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
   <soapenv:Body>
      <soapenv:Fault>
         <faultcode>soapenv:Client</faultcode>
         <faultstring>${errorMessage}</faultstring>
         <detail>
            <reason>INVALID_CREDENTIALS</reason>
         </detail>
      </soapenv:Fault>
   </soapenv:Body>
</soapenv:Envelope>`;
      }
    } else if (selectedService === 'Email') {
      serviceName = 'EmailService';
      operationName = 'SendEmail';
      tags = isSuccess ? 'Notification' : 'Notification,Network';
      notes = isSuccess ? 'Mail sent successfully.' : 'SMTP timeout connecting to mail relay server.';

      requestXml = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:em="http://example.com/email">
   <soapenv:Body>
      <em:SendEmailRequest>
         <em:Recipient>alerts@ops.internal</em:Recipient>
         <em:Subject>Integration simulation ping</em:Subject>
         <em:BodyText>This is a simulated logs test payload.</em:BodyText>
      </em:SendEmailRequest>
   </soapenv:Body>
</soapenv:Envelope>`;

      if (isSuccess) {
        responseXml = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:em="http://example.com/email">
   <soapenv:Body>
      <em:SendEmailResponse>
         <em:MessageID>${Math.random().toString(36).substring(2, 10)}</em:MessageID>
         <em:Status>SENT</em:Status>
      </em:SendEmailResponse>
   </soapenv:Body>
</soapenv:Envelope>`;
      } else {
        errorMessage = 'SMTP exception. Target host smtp.relay.internal refused connection on port 25.';
        responseXml = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
   <soapenv:Body>
      <soapenv:Fault>
         <faultcode>soapenv:Server</faultcode>
         <faultstring>${errorMessage}</faultstring>
         <detail>
            <smtpCode>421</smtpCode>
         </detail>
      </soapenv:Fault>
   </soapenv:Body>
</soapenv:Envelope>`;
      }
    } else {
      serviceName = 'InventoryService';
      operationName = 'CheckStock';
      tags = isSuccess ? 'Warehouse' : 'Warehouse,Timeout';
      notes = isSuccess ? 'Inventory quantity checked.' : 'Inventory server query timed out.';

      requestXml = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:inv="http://example.com/inventory">
   <soapenv:Body>
      <inv:CheckStockRequest>
         <inv:SKU>SKU-SIM-${Math.floor(Math.random() * 9000) + 1000}</inv:SKU>
         <inv:LocationID>LOC-MAIN</inv:LocationID>
      </inv:CheckStockRequest>
   </soapenv:Body>
</soapenv:Envelope>`;

      if (isSuccess) {
        responseXml = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:inv="http://example.com/inventory">
   <soapenv:Body>
      <inv:CheckStockResponse>
         <inv:SKU>SKU-SIM-9999</inv:SKU>
         <inv:AvailableQuantity>${Math.floor(Math.random() * 400)}</inv:AvailableQuantity>
      </inv:CheckStockResponse>
   </soapenv:Body>
</soapenv:Envelope>`;
      } else {
        errorMessage = 'Gateway timeout. The inventory service took too long to respond.';
        responseXml = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
   <soapenv:Body>
      <soapenv:Fault>
         <faultcode>soapenv:Server</faultcode>
         <faultstring>${errorMessage}</faultstring>
         <detail>
            <gatewayTimeoutMs>5000</gatewayTimeoutMs>
         </detail>
      </soapenv:Fault>
   </soapenv:Body>
</soapenv:Envelope>`;
      }
    }

    setCurrentMock({
      serviceName,
      operationName,
      requestXml,
      responseXml,
      httpStatusCode,
      executionTimeMs,
      errorMessage,
      status: trackingStatus,
      tags,
      notes
    });
  };

  useEffect(() => {
    generateMockPayload();
  }, [selectedService, outcome]);

  const handleSend = async () => {
    if (!currentMock) return;
    setSending(true);

    try {
      const response = await apiFetch('http://localhost:5234/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentMock)
      });

      if (response.ok) {
        setToast('SOAP Log Simulated & Sent Successfully!');
        setTimeout(() => setToast(null), 3000);
        // Regeneate
        generateMockPayload();
      } else {
        setToast('Failed to insert log API endpoint.');
        setTimeout(() => setToast(null), 3000);
      }
    } catch (err) {
      console.error(err);
      setToast('Network error simulator backend.');
      setTimeout(() => setToast(null), 3000);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="main-layout animate-fade-in" style={{ maxWidth: '1200px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>SOAP Transaction Simulator</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Generate and dispatch mock SOAP requests to test monitoring filters and export behaviors</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px', alignItems: 'start' }}>
        {/* Code Previews */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {currentMock && (
            <>
              {/* Request Panel */}
              <div className="glass-panel" style={{ padding: '20px', borderRadius: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Code size={18} style={{ color: '#60a5fa' }} />
                    <span style={{ fontWeight: 600 }}>Generated SOAP Request XML</span>
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {currentMock.serviceName}.xml
                  </span>
                </div>
                <div className="xml-container">
                  <pre className="xml-code">
                    <code>{formatXml(currentMock.requestXml)}</code>
                  </pre>
                </div>
              </div>

              {/* Response Panel */}
              <div className="glass-panel" style={{ padding: '20px', borderRadius: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Code size={18} style={{ color: outcome === 'success' ? '#10b981' : '#ef4444' }} />
                    <span style={{ fontWeight: 600 }}>Simulated SOAP Response XML</span>
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {outcome === 'success' ? 'Fault_Success.xml' : 'Fault_Error.xml'}
                  </span>
                </div>
                <div className="xml-container">
                  <pre className="xml-code">
                    <code>{formatXml(currentMock.responseXml)}</code>
                  </pre>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Configuration Panel */}
        <div className="glass-panel" style={{ padding: '24px', borderRadius: '12px', position: 'sticky', top: '100px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} style={{ color: 'var(--accent-light)' }} />
            Simulator Options
          </h2>

          {/* Service Selector */}
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label className="form-label">API Service Integration</label>
            <select 
              className="form-select" 
              value={selectedService} 
              onChange={(e) => setSelectedService(e.target.value as any)}
            >
              <option value="Payment">PaymentService (Credit Card)</option>
              <option value="Order">OrderService (Checkout)</option>
              <option value="User">UserService (Security Auth)</option>
              <option value="Email">EmailService (SMTP Relay)</option>
              <option value="Inventory">InventoryService (Stock Query)</option>
            </select>
          </div>

          {/* Status Choice */}
          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label className="form-label">Simulation Outcome</label>
            <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
              <button 
                type="button"
                onClick={() => setOutcome('success')}
                className={`btn ${outcome === 'success' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ 
                  flex: 1, 
                  padding: '8px', 
                  fontSize: '0.85rem',
                  background: outcome === 'success' ? 'var(--success-gradient)' : '',
                  border: outcome === 'success' ? 'none' : ''
                }}
              >
                <CheckCircle2 size={16} />
                Success
              </button>
              <button 
                type="button"
                onClick={() => setOutcome('failure')}
                className={`btn ${outcome === 'failure' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ 
                  flex: 1, 
                  padding: '8px', 
                  fontSize: '0.85rem',
                  background: outcome === 'failure' ? 'var(--danger-gradient)' : '',
                  border: outcome === 'failure' ? 'none' : ''
                }}
              >
                <AlertTriangle size={16} />
                Fault/Error
              </button>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '20px 0' }} />

          {/* Metadata preview card */}
          {currentMock && (
            <div style={{ 
              background: 'rgba(0,0,0,0.2)', 
              borderRadius: '8px', 
              padding: '16px', 
              fontSize: '0.85rem',
              marginBottom: '24px',
              border: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Method Name:</span>
                <strong style={{ fontFamily: 'var(--font-mono)' }}>{currentMock.operationName}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>HTTP Status:</span>
                <strong style={{ color: outcome === 'success' ? '#10b981' : '#ef4444' }}>{currentMock.httpStatusCode}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Latency:</span>
                <strong>{currentMock.executionTimeMs} ms</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Seeded Tags:</span>
                <div>
                  {currentMock.tags.split(',').map(t => (
                    <span key={t} style={{ marginLeft: '4px', fontSize: '0.7rem' }} className="tag-badge">{t}</span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Send Button */}
          <button 
            onClick={handleSend} 
            disabled={sending || !currentMock} 
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px' }}
          >
            <Send size={18} />
            {sending ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>

      {/* Floating toast notification */}
      {toast && (
        <div className="toast">
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: toast.includes('Successfully') ? '#10b981' : '#3b82f6'
          }}></div>
          <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{toast}</span>
        </div>
      )}
    </div>
  );
};
