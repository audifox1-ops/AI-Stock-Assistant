# Security & Stability Guide - AI STOCK

## Data Security
- **Data-at-Rest**: All sensitive user data (passwords, API keys) must be encrypted using AES-256 or bcrypt (for passwords).
- **Data-in-Transit**: Use TLS 1.3 for all client-server communications.
- **Privacy**: Implement field-level encryption for personal investment data to ensure that even database administrators cannot easily view individual portfolios.

## System Stability
- **Load Balancing**: Use Nginx or AWS ALB to distribute traffic and handle surges during market hours.
- **Error Handling**: Graceful degradation strategy. If AI analysis fails, the system should fall back to basic technical indicators and notify the user.
- **Rate Limiting**: Protect external Stock API usage by implementing an internal caching layer (Redis) to minimize redundant requests.

## Implementation Security (React/Vite)

- **Environment Variables**: Use `import.meta.env` for API keys. Never hardcode strings.
- **XSS Prevention**: Avoid `dangerouslySetInnerHTML`. React automatically escapes values in JSX.
- **Input Validation**: Sanitize stock names and prices before state updates or API calls.
- **Dependency Audit**: Regularly run `npm audit` to check for vulnerable packages.

## Supabase Security (Upcoming)
- **RLS (Row Level Security)**: Enable RLS on all tables. Use `auth.uid() = user_id` policies.
- **Anon Key**: Use only the `anon` key on the client side; never expose the `service_role` key.
