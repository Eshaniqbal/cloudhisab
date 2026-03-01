import { gql } from "@apollo/client";

// ─── Dashboard ───
export const GET_DASHBOARD = gql`
  query GetDashboard($date: String) {
    getDashboard(date: $date) {
      today {
        date
        totalSales
        totalProfit
        totalExpenses
        netProfit
        invoiceCount
        itemsSold
      }
      month {
        date
        totalSales
        totalProfit
        totalExpenses
        netProfit
        invoiceCount
      }
      topProducts {
        productId
        productName
        sku
        totalQuantitySold
        totalRevenue
        totalProfit
      }
      lowStockCount
      pendingInvoices
    }
  }
`;

// ─── Products ───
export const LIST_PRODUCTS = gql`
  query ListProducts {
    listProducts {
      items {
        productId
        name
        sku
        hsnCode
        costPrice
        sellingPrice
        gstRate
        category
        unit
        lowStockAlert
        marginPercent
        gstAmount
        sellingPriceWithGst
        createdAt
      }
      total
    }
  }
`;

export const GET_PRODUCT = gql`
  query GetProduct($productId: String!) {
    getProduct(productId: $productId) {
      productId
      name
      sku
      costPrice
      sellingPrice
      gstRate
      category
      unit
      lowStockAlert
      marginPercent
      sellingPriceWithGst
    }
  }
`;

// ─── Invoices ───
export const LIST_INVOICES = gql`
  query ListInvoices($dateFrom: String, $limit: Int) {
    listInvoices(dateFrom: $dateFrom, limit: $limit) {
      items {
        saleId
        invoiceNumber
        customerName
        customerPhone
        subtotal
        totalGst
        discountAmount
        totalAmount
        totalProfit
        paymentMethod
        pdfUrl
        createdAt
        items {
          productName
          sku
          quantity
          sellingPrice
          gstRate
          gstAmount
          lineTotal
          profit
        }
      }
      total
    }
  }
`;

export const GET_INVOICE = gql`
  query GetInvoice($saleId: String!) {
    getInvoice(saleId: $saleId) {
      saleId
      invoiceNumber
      customerName
      customerPhone
      customerGstin
      items {
        productId
        productName
        sku
        quantity
        costPrice
        sellingPrice
        gstRate
        gstAmount
        profit
        lineTotal
        lineTotalWithGst
      }
      subtotal
      totalGst
      discountAmount
      totalAmount
      totalCost
      totalProfit
      paymentMethod
      pdfUrl
      notes
      createdAt
      businessName
      businessGstin
      businessAddress
      businessPhone
      businessCity
      businessState
    }
  }
`;

export const GET_INVOICE_DOWNLOAD_URL = gql`
  query GetInvoiceDownloadUrl($saleId: String!) {
    getInvoiceDownloadUrl(saleId: $saleId)
  }
`;

// ─── Stock ───
export const GET_STOCK_LEVELS = gql`
  query GetStockLevels {
    getStockLevels {
      productId
      productName
      sku
      totalIn
      totalOut
      currentStock
      lowStockAlert
      isLowStock
    }
  }
`;

// ─── Expenses ───
export const LIST_EXPENSES = gql`
  query ListExpenses($month: String!) {
    listExpenses(month: $month) {
      items {
        expenseId
        amount
        category
        description
        date
        paymentMethod
        createdAt
      }
      totalAmount
      byCategory {
        category
        total
        count
      }
    }
  }
`;

// ─── Reports ───
export const GET_PROFIT_REPORT = gql`
  query GetProfitReport($dateFrom: String!, $dateTo: String!) {
    getProfitReport(dateFrom: $dateFrom, dateTo: $dateTo) {
      dateFrom
      dateTo
      grossProfit
      totalExpenses
      netProfit
      totalRevenue
      totalCost
      invoiceCount
      profitMarginPercent
      dailyBreakdown {
        date
        totalSales
        totalProfit
        totalExpenses
        netProfit
        invoiceCount
      }
    }
  }
`;

export const GET_GSTR1_REPORT = gql`
  query GetGstr1Report($dateFrom: String!, $dateTo: String!) {
    getGstr1Report(dateFrom: $dateFrom, dateTo: $dateTo) {
      dateFrom
      dateTo
      totalTaxableValue
      totalGstAmount
      totalInvoiceValue
      b2bB2c {
        b2bTaxableValue
        b2bGstAmount
        b2bTotalValue
        b2cTaxableValue
        b2cGstAmount
        b2cTotalValue
      }
      hsnSummary {
        hsnCode
        totalQuantity
        totalTaxableValue
        totalGstAmount
        totalValue
      }
      taxSlabSummary {
        gstRate
        totalTaxableValue
        totalGstAmount
        totalValue
      }
    }
  }
`;

// ─── Customers / Ledger ───
export const LIST_CUSTOMERS = gql`
  query ListCustomers($search: String) {
    listCustomers(search: $search) {
      items {
        customerId
        name
        phone
        gstin
        totalInvoiced
        totalPaid
        advance
        outstanding
        invoiceCount
        lastInvoiceDate
      }
      total
    }
  }
`;

export const GET_CUSTOMER_LEDGER = gql`
  query GetCustomerLedger($phone: String!) {
    getCustomerLedger(phone: $phone) {
      customer {
        customerId
        name
        phone
        gstin
        totalInvoiced
        totalPaid
        advance
        outstanding
        invoiceCount
        lastInvoiceDate
      }
      entries {
        entryId
        entryType
        amount
        amountPaid
        balanceAfter
        description
        date
        createdAt
      }
    }
  }
`;

export const GET_CUSTOMER_BY_PHONE = gql`
  query GetCustomerByPhone($phone: String!) {
    getCustomerByPhone(phone: $phone) {
      customerId
      name
      phone
      gstin
      outstanding
      totalInvoiced
      totalPaid
      invoiceCount
    }
  }
`;

// ─── Tenant Settings ───
export const GET_TENANT_PROFILE = gql`
  query GetTenantProfile {
    getTenantProfile {
      tenantId
      businessName
      ownerName
      email
      phone
      gstin
      address
      city
      state
      pincode
      plan
      createdAt
    }
  }
`;

export const LIST_USERS = gql`
  query ListUsers {
    listUsers {
      userId
      name
      email
      role
      isActive
      createdAt
    }
  }
`;
