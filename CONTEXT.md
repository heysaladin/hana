# HANA App — Project Context (PRD)

## 1. Product Context

Product: HANA (Hasab wa Nasab)
Feature: Family Tree Application

Problem
Users cannot remember all their family and the relations.

Goal
Provide a clear family tree that easy to manage.

## 2. User Types

### Family member
Person want to close to his family.

## 3. User Flow

1. User create, read, update & delete family tree
2. Zoom in zoom out family tree
3. View details node

### User Stories

User want to create, read, update & delete family tree.

## 4. Screens

1. Family tree diagram
2. Person details view mode
3. Person form for create and update

## 5. Screen Requirements

Components
- Family tree diagram CANVAS
- Person details view mode
- Form

States
- View
- Create
- Update
- Delete

### User interaction and design

./screen_designs.png

## 6. Data Model (Very Important for AI)

#### Entity:
persons
#### Fields:
id: UUID
name
nickname
honorific
gender
birth_date
is_dead
death_date
photo_url
additional_information
created_at: datetime
updated_at: datetime

#### Entity: 
relationships
#### Fields:
id: UUID
person1_id (uuid)
person2_id (uuid)
relationship_type
created_at: datetime
updated_at: datetime

## 7. Business Rules

Rules

1. Create person

2. Update person

3. Delete person

## 8. Edge Cases

- Missing photo
- Duplicate person

## 9. Success Metrics

Add node of person
Upload profile image from gallery
Update node of person
Delete node of person

## 10. Tech Constraints (Optional)

Stack

Diagram: React-Flow.js
Frontend: React / Next.js
Backend: Supabase
Database: Postgres
Storage: Supabase (profile image)