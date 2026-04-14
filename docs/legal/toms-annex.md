# Technical and Organisational Measures Annex

This annex describes the technical and organisational measures currently intended for Zemio. It is a working draft and should be reviewed before production launch.

## 1. Access Control

- Access to the service is restricted to approved customer organizations.
- Users authenticate through Microsoft login.
- Organization-scoped permissions and roles are enforced in the application.
- Administrative privileges are restricted to authorized users.

## 2. Authentication and Session Security

- Session handling is managed by the application authentication system.
- Session-related metadata such as IP address and user agent may be processed for security and operational purposes.
- Trusted origins are restricted at application level.

## 3. Data Segregation

- Customer data is logically separated by organization within the application and database model.
- Attachment keys are namespaced by organization.
- Role checks are performed before granting access to reports, attachments, settings, and administrative functions.

## 4. Encryption and Transmission Security

- Zemio intends to use HTTPS/TLS for transport encryption in production.
- Banking details are encrypted in the application layer using AES-256-GCM before storage.
- Object storage access for protected attachments is controlled through authenticated checks and time-limited presigned URLs where applicable.

## 5. Storage Security

- Structured data is stored in a managed PostgreSQL database.
- Attachments are stored in dedicated object storage.
- Secrets are intended to be stored in environment-based secrets management rather than source code.

## 6. Availability and Resilience

- Production hosting is intended to run on managed infrastructure through Vercel.
- Managed services are used for database and storage components.
- Backups are expected to be retained for a limited period, currently targeted at 30 days.
- Zemio reserves the right to perform maintenance and security interventions as needed.

## 7. Logging and Monitoring

- Operational logs and error monitoring are used to detect service failures and security incidents.
- Better Stack is intended to be used for operational monitoring.
- Non-essential session replay is not intended to be enabled in production.

## 8. Integrity and Change Management

- Source code changes are managed through version control.
- Production changes are expected to be deployed through controlled release processes.
- Access to production configuration should be restricted to authorized persons only.

## 9. Confidentiality of Personnel

- Access to customer data is limited to persons who need such access for service operation, support, security, or legal compliance.
- Persons with such access are expected to be bound by confidentiality obligations.

## 10. Incident Management

- Zemio maintains operational monitoring to identify incidents.
- Suspected personal data breaches affecting customer data should be investigated without undue delay.
- Customer organizations should be notified without undue delay where processor-side breach notification duties apply.

## 11. Data Subject Rights and Deletion Support

- Zemio provides administrative and application-level functions to access and export relevant data.
- Customer data can be deleted in accordance with retention rules, customer instructions, and legal obligations.

## 12. Review

These measures may be updated from time to time to reflect changes in the service, threat landscape, infrastructure, or legal requirements, provided the overall protection level is not materially reduced without appropriate reason.
