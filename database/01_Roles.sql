-- ==========================================
-- Database Design Phase: 01_Roles.sql
-- Database: RentalManagementSystem
-- Created: 2026-07-18
-- Author: AI Coding Agent
-- Description: Creates the Roles table with named constraints.
-- ==========================================

USE [RentalManagementSystem];
GO

-- Set standard ANSI options for scripting
SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO

-- =========================================================================
-- TABLE: Roles
-- =========================================================================
-- This table stores security roles that define access permissions and privileges
-- within the Rental Management System (e.g., Administrator, Tenant, Owner).
-- =========================================================================

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Roles]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[Roles] (
        -- -----------------------------------------------------------------
        -- COLUMNS WITH INLINE DEFAULT CONSTRAINTS
        -- -----------------------------------------------------------------
        
        -- [RoleId]: Unique autoincrementing identifier for each role.
        -- Uses the INT data type for standard scaling.
        -- Marked as NOT NULL because it is the primary identity column.
        [RoleId] INT IDENTITY(1,1) NOT NULL,

        -- [RoleName]: Unique, user-friendly string identifier for the role.
        -- Uses NVARCHAR(50) to support up to 50 Unicode characters.
        -- Marked as NOT NULL as every role must have a defined name.
        [RoleName] NVARCHAR(50) NOT NULL,

        -- [Description]: A narrative description explaining the responsibilities of the role.
        -- Uses NVARCHAR(255) to support up to 255 Unicode characters.
        -- Marked as NULL to allow empty descriptions.
        [Description] NVARCHAR(255) NULL,

        -- [CreatedAt]: High-precision system timestamp capturing when the role was created.
        -- Uses DATETIME2 for standard high accuracy.
        -- Marked as NOT NULL.
        -- Features a named default constraint [DF_Roles_CreatedAt] initializing it to the current UTC timestamp.
        [CreatedAt] DATETIME2 NOT NULL CONSTRAINT [DF_Roles_CreatedAt] DEFAULT SYSUTCDATETIME(),

        -- [UpdatedAt]: High-precision system timestamp capturing the last update made to the role.
        -- Uses DATETIME2.
        -- Marked as NOT NULL.
        -- Features a named default constraint [DF_Roles_UpdatedAt] initializing it to the current UTC timestamp.
        [UpdatedAt] DATETIME2 NOT NULL CONSTRAINT [DF_Roles_UpdatedAt] DEFAULT SYSUTCDATETIME(),

        -- -----------------------------------------------------------------
        -- TABLE-LEVEL CONSTRAINTS & KEYS
        -- -----------------------------------------------------------------

        -- [PK_Roles_RoleId]: Primary Key constraint enforcing entity integrity.
        -- Created as a CLUSTERED index, physically ordering database storage by RoleId.
        CONSTRAINT [PK_Roles_RoleId] PRIMARY KEY CLUSTERED ([RoleId]),

        -- [UQ_Roles_RoleName]: Unique Key constraint enforcing unique naming.
        -- Created as a NONCLUSTERED index to prevent duplicate Roles (e.g., duplicate 'Admin' names).
        CONSTRAINT [UQ_Roles_RoleName] UNIQUE NONCLUSTERED ([RoleName])
    );
    
    PRINT 'Table [dbo].[Roles] created successfully with all columns and named constraints.';
END
ELSE
BEGIN
    PRINT 'Table [dbo].[Roles] already exists.';
END
GO
