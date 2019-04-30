# Order Management app

The Order Management app is a Zendesk App built to demo Zendesk order management capabilities using Sunshine Objects & Events. The app lets agents search through or sort orders, view order attributes, detail and events from the ticket sidebar. 

## Screenshot(s):
![](https://cl.ly/2bdd73405032/Screen%252520Recording%2525202019-02-27%252520at%25252002.11%252520pm.gif)

## App location

* Ticket sidebar

## Features

* View list of orders related to the requester of the ticket.
* Filter list of orders by searching for ID, date, source or type.
* Sort list of orders by ID or creation date.
* View order attributes.
* View product SKUs related to a specific order.
* View events related to a specific order. 

## Using the app

### Prerequisites

* You must be on Zendesk Enterprise plan to have access to Custom Objects.
* The User Events API is currently in Early Access. You must sign up to the [User Events API early access program](https://develop.zendesk.com/hc/en-us/articles/360001844267-Using-the-User-Events-API-early-access-) to be able use the API and create Custom User Events.
* You must be technically able to make API calls to create the order and SKUs objects records, and the relationship records to tie them together with the user. See [Custom Objects Documentation](https://developer.zendesk.com/rest_api/docs/custom-objects-api/introduction) for more detail. 

### Getting started
Download this project as a ZIP file and upload it as a private app to get started.

#### 1. Create the object types
An object type is a blueprint for creating object records of the same type. You can create the types via API or through the Zendesk UI (Admin > Manage > Custom Objects). You can specify any number of properties for your object. All properties have to be of type **string**, and make sure to **use the same key as defined below**:

1. Create object type with key = **order** ([example](https://cl.ly/1187aed75e4e))
2. Create object type with key = **sku** ([example](https://cl.ly/36c3923e2d4f))

#### 2. Create the relationship types
A relationship type defines a relationship between object records (1-to-1, 1-to-many, many-to-many).

1. Create a 1-to-many relationship type with key = **ordered** / source = zen:user / type = 1:many / target = order ([example](https://cl.ly/1ab0faba7727)).
2. Create a many-to-many relationship type by creating 2x 1-to-many relationship types:
    1. Relationship type with key = **contains** / source = order / type = 1:many / target = sku ([example](https://cl.ly/6be6d7c32ef4)).
    2. Relationship type key = **used_in** / source = sku / type = 1:many / target = order ([example](https://cl.ly/51d7586081ba)).

#### 3. Create the object records
An Object record is a placeholder for the data you want to diplay. The data is can contain is defined by the object type that you choose. You need to use the API to create object records.

1. Create one or multiple **sku** object record(s). Images placed the img folder of the app can be referenced by name in the attributes to be rendered as images ([example](https://cl.ly/5ba80d331f14)).
2. Create one or multiple **order** object record(s). Use external_id as the order name that will be displayed and searchable (mandatory). Underscores "_" will be replaced by spaces " " ([example](https://cl.ly/a8eaec45ecaf)).

#### 4. Create the relationship records
Relationship records create associations between object records based on a pre-defined relationship type. You need to use the API to create relationship records.

1. Link one or multiple **sku** records with an order record using the **contains** relationship type ([example](https://cl.ly/f7a77abf5eb4)).
2. Link one or multiple **order** records with a Zendesk user using the **ordered** relationship type ([example](https://cl.ly/d31540eb7cfe)).

#### 5. Create the events related to an order
Sunshine Events let you build a timeline of all your customers' interactions from any source. Here they are used to show order related events such as order placed/prepared/delivered. You need to use the API to create events.

1. Create custom events where source = **external_id** of the order you want the event to be linked to. 

### About the app

#### Understand the data model
![](https://cl.ly/31f354bfa02a/QuickDBD-Order_Management_App-Data_Model.png)

#### Understand the app's layout & data

**Sidebar App:**: order list

![](https://cl.ly/003ef3c79340/Screenshot%2525202019-02-27%252520at%25252016.39.10.png)

**Modal:** order detail & events

![](https://cl.ly/24ccc327add0/Screenshot%2525202019-02-27%252520at%25252017.03.06.png)
