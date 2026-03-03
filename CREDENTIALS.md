# Artico Credentials Reference

**⚠️ PRIVATE FILE - DO NOT COMMIT TO GIT**

## GitHub

**Account:** owainartico  
**Email:** owain@artico.net.au  
**Personal Access Token:** `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`  
**Stored in:** `C:\Users\User\.git-credentials`

**Repositories:**
- https://github.com/owainartico/demand-planner
- https://github.com/owainartico/artico-sync-worker

## Render

**Dashboard:** https://dashboard.render.com  
**Email:** owain@artico.net.au  
**Credentials:** Logged in via browser (openclaw profile)

**Services:**
- demand-planner (srv-d6foq9p5pdvs73flm5a0)
- artico-data (dpg-d6hra4jh46gs73edgj00-a) - PostgreSQL database
- demand-planner-db (dpg-d6fp7kcr85hc73b091mg-a) - PostgreSQL database

## Zoho OAuth

**Client ID:** 1000.51VLX2FSXZL23ATPODORL2384XTR4Q  
**Client Secret:** 514aa281d409902b2f16e38dee9e6109665805959b  
**Refresh Token:** 1000.1ebcdcd167ef347482c800fb4c7d1b00.dda7df36fba7f1ec802552e33c8c4564  
**Organization ID:** 689159620  

**Stored in:** `C:\Users\User\.openclaw\workspace\zoho-credentials.json`

## Database Connections

### artico-data (Shared Database)
```
postgresql://artico_data_user:09LXJeVtcNh0jiAaagJmNsAqRVb7sinT@dpg-d6hra4jh46gs73edgj00-a/artico_data
```

**Internal:** dpg-d6hra4jh46gs73edgj00-a  
**External:** dpg-d6hra4jh46gs73edgj00-a.oregon-postgres.render.com

### demand-planner-db (App-Specific)
```
postgresql://demand_planner_db_user:VdI93Noie7g7QimW0ARB2pOps6YCHgke@dpg-d6fp7kcr85hc73b091mg-a/demand_planner_db
```

**Internal:** dpg-d6fp7kcr85hc73b091mg-a  
**External:** dpg-d6fp7kcr85hc73b091mg-a.oregon-postgres.render.com

## Application URLs

**Demand Planner:** https://supply.artico.au  
**Password:** artico2026

## Notes

- GitHub credentials stored automatically via git credential helper
- Render authentication via browser (persistent session)
- Zoho OAuth tokens auto-refresh (handled by code)
- All databases in Oregon (US West) region
