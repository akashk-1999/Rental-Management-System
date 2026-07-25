import { query, execute } from '../config/db';
import bcrypt from 'bcryptjs';
import logger from '../utils/logger';

export async function initDatabaseSchema(): Promise<void> {
  logger.info('[Database] Verifying tables and initializing MS SQL Server schema...');
  try {
    await initSQLServerSchema();
    await seedDefaultAdmin();
    logger.info('[Database] SQL Server schema verification and initialization complete.');
  } catch (err: any) {
    logger.error(`[Database Init Error] Failed during schema initialization: ${err.message}`);
    throw err;
  }
}

async function initSQLServerSchema(): Promise<void> {
  const checkTableSql = "SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Users'";
  const tablesExist = await query(checkTableSql);
  
  if (tablesExist.length === 0) {
    logger.info('[Database] SQL Server tables do not exist. Executing full MS SQL DDL script...');
    
    // Create Users Table
    await execute(`
      CREATE TABLE Users (
        UserId INT IDENTITY(1,1) PRIMARY KEY,
        Username NVARCHAR(50) NOT NULL UNIQUE,
        PasswordHash NVARCHAR(255) NOT NULL,
        FullName NVARCHAR(100) NOT NULL,
        Role NVARCHAR(20) NOT NULL CHECK (Role IN ('Admin','Staff')),
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2 NULL
      );
    `);

    // Create ItemCategories Table
    await execute(`
      CREATE TABLE ItemCategories (
        CategoryId INT IDENTITY(1,1) PRIMARY KEY,
        CategoryName NVARCHAR(100) NOT NULL UNIQUE,
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2 NULL
      );
    `);

    // Create Items Table
    await execute(`
      CREATE TABLE Items (
        ItemId INT IDENTITY(1,1) PRIMARY KEY,
        ItemName NVARCHAR(150) NOT NULL,
        CategoryId INT NOT NULL FOREIGN KEY REFERENCES ItemCategories(CategoryId),
        ItemCode NVARCHAR(50) NULL UNIQUE,
        UnitType NVARCHAR(20) NOT NULL DEFAULT 'Piece',
        TotalQuantity INT NOT NULL DEFAULT 0,
        RentalPrice DECIMAL(10,2) NOT NULL DEFAULT 0,
        SecurityDeposit DECIMAL(10,2) NULL,
        Description NVARCHAR(500) NULL,
        ImageUrl NVARCHAR(255) NULL,
        Status NVARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (Status IN ('Active','Inactive')),
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2 NULL,
        CONSTRAINT CK_Items_TotalQuantity CHECK (TotalQuantity >= 0)
      );
    `);

    await execute(`CREATE INDEX IX_Items_CategoryId ON Items(CategoryId);`);
    await execute(`CREATE INDEX IX_Items_Status ON Items(Status);`);

    // Create Customers Table
    await execute(`
      CREATE TABLE Customers (
        CustomerId INT IDENTITY(1,1) PRIMARY KEY,
        CustomerName NVARCHAR(150) NOT NULL,
        MobileNumber NVARCHAR(20) NOT NULL UNIQUE,
        AlternateNumber NVARCHAR(20) NULL,
        Address NVARCHAR(300) NULL,
        IdProof NVARCHAR(100) NULL,
        Notes NVARCHAR(500) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2 NULL
      );
    `);

    await execute(`CREATE INDEX IX_Customers_MobileNumber ON Customers(MobileNumber);`);

    // Create Rentals Table
    await execute(`
      CREATE TABLE Rentals (
        RentalId INT IDENTITY(1,1) PRIMARY KEY,
        RentalCode NVARCHAR(20) NOT NULL UNIQUE,
        CustomerId INT NOT NULL FOREIGN KEY REFERENCES Customers(CustomerId),
        RentalStartDate DATE NOT NULL,
        ExpectedReturnDate DATE NOT NULL,
        Status NVARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (Status IN ('Active','PartialReturn','Returned','Overdue','Cancelled')),
        TotalAmount DECIMAL(12,2) NOT NULL DEFAULT 0,
        AdvancePaid DECIMAL(12,2) NOT NULL DEFAULT 0,
        SecurityDepositPaid DECIMAL(12,2) NOT NULL DEFAULT 0,
        PaymentStatus NVARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (PaymentStatus IN ('Paid','Partial','Pending')),
        Notes NVARCHAR(500) NULL,
        CreatedByUserId INT NOT NULL FOREIGN KEY REFERENCES Users(UserId),
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2 NULL
      );
    `);

    await execute(`CREATE INDEX IX_Rentals_CustomerId ON Rentals(CustomerId);`);
    await execute(`CREATE INDEX IX_Rentals_Status ON Rentals(Status);`);
    await execute(`CREATE INDEX IX_Rentals_ExpectedReturnDate ON Rentals(ExpectedReturnDate);`);

    // Create RentalLineItems Table
    await execute(`
      CREATE TABLE RentalLineItems (
        RentalLineItemId INT IDENTITY(1,1) PRIMARY KEY,
        RentalId INT NOT NULL FOREIGN KEY REFERENCES Rentals(RentalId) ON DELETE CASCADE,
        ItemId INT NOT NULL FOREIGN KEY REFERENCES Items(ItemId),
        QuantityRented INT NOT NULL CHECK (QuantityRented > 0),
        UnitPrice DECIMAL(10,2) NOT NULL,
        LineTotal AS (QuantityRented * UnitPrice) PERSISTED,
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
      );
    `);

    await execute(`CREATE INDEX IX_RentalLineItems_RentalId ON RentalLineItems(RentalId);`);
    await execute(`CREATE INDEX IX_RentalLineItems_ItemId ON RentalLineItems(ItemId);`);

    // Create ReturnEvents Table
    await execute(`
      CREATE TABLE ReturnEvents (
        ReturnEventId INT IDENTITY(1,1) PRIMARY KEY,
        RentalLineItemId INT NOT NULL FOREIGN KEY REFERENCES RentalLineItems(RentalLineItemId),
        ReturnDate DATE NOT NULL,
        QuantityReturned INT NOT NULL DEFAULT 0 CHECK (QuantityReturned >= 0),
        QuantityDamaged INT NOT NULL DEFAULT 0 CHECK (QuantityDamaged >= 0),
        QuantityMissing INT NOT NULL DEFAULT 0 CHECK (QuantityMissing >= 0),
        DamageStatus NVARCHAR(20) NULL CHECK (DamageStatus IN ('Repairable','Damaged','Lost') OR DamageStatus IS NULL),
        Notes NVARCHAR(500) NULL,
        RecordedByUserId INT NOT NULL FOREIGN KEY REFERENCES Users(UserId),
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
      );
    `);

    await execute(`CREATE INDEX IX_ReturnEvents_RentalLineItemId ON ReturnEvents(RentalLineItemId);`);
    await execute(`CREATE INDEX IX_ReturnEvents_ReturnDate ON ReturnEvents(ReturnDate);`);

    // Create Payments Table
    await execute(`
      CREATE TABLE Payments (
        PaymentId INT IDENTITY(1,1) PRIMARY KEY,
        RentalId INT NOT NULL FOREIGN KEY REFERENCES Rentals(RentalId) ON DELETE CASCADE,
        PaymentDate DATE NOT NULL DEFAULT CAST(SYSUTCDATETIME() AS DATE),
        Amount DECIMAL(12,2) NOT NULL CHECK (Amount > 0),
        PaymentType NVARCHAR(20) NOT NULL DEFAULT 'Advance' CHECK (PaymentType IN ('Advance','Partial','Final','SecurityDeposit','Refund')),
        PaymentMode NVARCHAR(20) NULL,
        Notes NVARCHAR(300) NULL,
        RecordedByUserId INT NOT NULL FOREIGN KEY REFERENCES Users(UserId),
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
      );
    `);

    await execute(`CREATE INDEX IX_Payments_RentalId ON Payments(RentalId);`);

    // Create SQL Server Views
    logger.info('[Database] Creating database views...');
    await execute(`
      CREATE VIEW vw_ItemInventoryStatus AS
      WITH RentedOut AS (
          SELECT
              rli.ItemId,
              SUM(rli.QuantityRented) AS TotalRented,
              SUM(ISNULL(re.TotalReturned,0)) AS TotalReturned,
              SUM(ISNULL(re.TotalDamaged,0)) AS TotalDamaged,
              SUM(ISNULL(re.TotalMissing,0)) AS TotalMissing
          FROM RentalLineItems rli
          JOIN Rentals r ON r.RentalId = rli.RentalId
          OUTER APPLY (
              SELECT SUM(QuantityReturned) AS TotalReturned,
                     SUM(QuantityDamaged)  AS TotalDamaged,
                     SUM(QuantityMissing)  AS TotalMissing
              FROM ReturnEvents
              WHERE RentalLineItemId = rli.RentalLineItemId
          ) re
          WHERE r.Status IN ('Active','PartialReturn','Overdue')
          GROUP BY rli.ItemId
      )
      SELECT
          i.ItemId,
          i.ItemName,
          i.CategoryId,
          i.TotalQuantity,
          ISNULL(ro.TotalRented - ro.TotalReturned - ro.TotalDamaged - ro.TotalMissing, 0) AS CurrentlyRented,
          ISNULL(ro.TotalDamaged, 0) AS DamagedStock,
          ISNULL(ro.TotalMissing, 0) AS LostStock,
          i.TotalQuantity - ISNULL(ro.TotalRented - ro.TotalReturned - ro.TotalDamaged - ro.TotalMissing, 0) - ISNULL(ro.TotalDamaged, 0) - ISNULL(ro.TotalMissing, 0) AS AvailableStock
      FROM Items i
      LEFT JOIN RentedOut ro ON ro.ItemId = i.ItemId
      WHERE i.Status = 'Active';
    `);

    await execute(`
      CREATE VIEW vw_UpcomingReturns AS
      SELECT
          r.RentalId,
          r.RentalCode,
          c.CustomerName,
          c.MobileNumber,
          r.ExpectedReturnDate,
          r.Status
      FROM Rentals r
      JOIN Customers c ON c.CustomerId = r.CustomerId
      WHERE r.Status IN ('Active','PartialReturn');
    `);

    await execute(`
      CREATE VIEW vw_OverdueRentals AS
      SELECT
          r.RentalId,
          r.RentalCode,
          c.CustomerName,
          c.MobileNumber,
          r.ExpectedReturnDate,
          DATEDIFF(DAY, r.ExpectedReturnDate, CAST(SYSUTCDATETIME() AS DATE)) AS DaysOverdue
      FROM Rentals r
      JOIN Customers c ON c.CustomerId = r.CustomerId
      WHERE r.Status IN ('Active','PartialReturn')
        AND r.ExpectedReturnDate < CAST(SYSUTCDATETIME() AS DATE);
    `);
    logger.info('[Database] Full DDL execution complete.');
  } else {
    logger.info('[Database] SQL Server tables already exist.');
  }

  await ensureItemCategoriesUpdatedAtColumn();
}

/**
 * Migration guard: adds the UpdatedAt column to ItemCategories for databases that were
 * initialized before the column was introduced. Safe to run on every startup.
 */
async function ensureItemCategoriesUpdatedAtColumn(): Promise<void> {
  const columnExists = await query(
    "SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'ItemCategories' AND COLUMN_NAME = 'UpdatedAt'"
  );

  if (columnExists.length === 0) {
    logger.info('[Database] Adding missing UpdatedAt column to ItemCategories table...');
    await execute('ALTER TABLE ItemCategories ADD UpdatedAt DATETIME2 NULL;');
  }
}

async function seedDefaultAdmin(): Promise<void> {
  const users = await query('SELECT * FROM Users WHERE Username = @Username', { Username: 'admin' });
  if (users.length === 0) {
    logger.info('[Database] Seeding default admin user (admin / admin123)...');
    const passwordHash = await bcrypt.hash('admin123', 10);
    
    await execute(`
      INSERT INTO Users (Username, PasswordHash, FullName, Role, IsActive)
      VALUES (@Username, @PasswordHash, @FullName, @Role, @IsActive)
    `, {
      Username: 'admin',
      PasswordHash: passwordHash,
      FullName: 'Administrator',
      Role: 'Admin',
      IsActive: 1
    });
    logger.info('[Database] Default admin user seeded successfully.');
  }
}
