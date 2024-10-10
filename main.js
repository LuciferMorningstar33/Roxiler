const express = require('express');
const app = express();
const axios = require('axios');
const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'roxiler',
  password: 'prithvicodes',
  port: 5432,
});

const createTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      price DECIMAL(10, 2) NOT NULL,
      date_of_sale DATE NOT NULL,
      category VARCHAR(255) NOT NULL
    );
  `;
  await pool.query(query);
};

//GET
createTable().then(() => {
  app.get('/init-db', async (req, res) => {
    try {
      const response = await axios.get('https://s3.amazonaws.com/roxiler.com/product_transaction.json');
      const data = response.data;
      const insertQuery = `
        INSERT INTO products (title, description, price, date_of_sale, category)
        VALUES ($1, $2, $3, $4, $5)
      `;
      for (const product of data) {
        await pool.query(insertQuery, [
          product.title,
          product.description,
          product.price,
          product.dateOfSale,
          product.category,
        ]);
      }
      res.send('Database initialized successfully');
    } catch (error) {
      console.error(error);
      res.status(500).send('Error initializing database');
    }
  });


app.use(express.json()); // This middleware parses JSON requests
app.use(express.urlencoded({ extended: true })); // This middleware parses URL-encoded requests
//POST
app.post('/products', async (req, res) => {
    try {
      if (!req.body) {
        res.status(400).send('Request body is empty');
        return;
      }
      const { title, description, price, dateOfSale, category } = req.body;
      const query = `
        INSERT INTO products (title, description, price, date_of_sale, category)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;
      const result = await pool.query(query, [
        title,
        description,
        price,
        dateOfSale,
        category,
      ]);
      res.send(`Product created successfully: ${result.rows[0].title}`);
    } catch (error) {
      console.error(error);
      res.status(500).send('Error creating product');
    }
  });

  //GET
  app.get('/products', async (req, res) => {
    try {
      const query = `SELECT * FROM products`;
      const result = await pool.query(query);
      res.send(result.rows);
    } catch (error) {
      console.error(error);
      res.status(500).send('Error retrieving products');
    }
  });

  //GET for single product with unique id
  app.get('/products/:id', async (req, res) => {
    try {
      const id = req.params.id;
      const query = `SELECT * FROM products WHERE id = $1`;
      const result = await pool.query(query, [id]);
      if (result.rows.length === 0) {
        res.status(404).send('Product not found');
      } else {
        res.send(result.rows[0]);
      }
    } catch (error) {
      console.error(error);
      res.status(500).send('Error retrieving product');
    }
  });

  //PUT
  app.put('/products/:id', async (req, res) => {
    try {
      const id = req.params.id;
      const { title, description, price, dateOfSale, category } = req.body;
      const query = `
        UPDATE products
        SET title = $1, description = $2, price = $3, date_of_sale = $4, category = $5
        WHERE id = $6
        RETURNING *
      `;
      const result = await pool.query(query, [
        title,
        description,
        price,
        dateOfSale,
        category,
        id,
      ]);
      res.send(`Product updated successfully: ${result.rows[0].title}`);
    } catch (error) {
      console.error(error);
      res.status(500).send('Error updating product');
    }
  });

  //DELETE
  app.delete('/products/:id', async (req, res) => {
    try {
      const id = req.params.id;
      const query = `DELETE FROM products WHERE id = $1`;
      await pool.query(query, [id]);
      res.send(`Product deleted successfully`);
    } catch (error) {
      console.error(error);
      res.status(500).send('Error deleting product');
    }
  });

  // GET /transactions Task 2
  app.get('/page', async (req, res) => {
    try {
        const { page = 1, perPage = 10, search = '', month } = req.query;
        const offset = (page - 1) * perPage;
        let query = `
            SELECT *
            FROM products
        `;
        let params = [];

        if (search) {
            query += `
                WHERE title ILIKE $1::text OR description ILIKE $1::text OR price::text ILIKE $1::text
            `;
            params.push(`%${search}%`);
        }

        if (month) {
            if (params.length > 0) {
                query += ` AND `;
            } else {
                query += ` WHERE `;
            }
            query += `EXTRACT(MONTH FROM date_of_sale) = $${params.length + 1}`;
            params.push(month);
        }

        query += `
            ORDER BY id
            LIMIT $${params.length + 1}
            OFFSET $${params.length + 2}
        `;
        params.push(perPage, offset);

        const result = await pool.query(query, params);

        let countQuery = `
            SELECT COUNT(*) AS total
            FROM products
        `;
        let countParams = [];

        if (search) {
            countQuery += `
                WHERE title ILIKE $1::text OR description ILIKE $1::text OR price::text ILIKE $1::text
            `;
            countParams.push(`%${search}%`);
        }

        if (month) {
            if (countParams.length > 0) {
                countQuery += ` AND `;
            } else {
                countQuery += ` WHERE `;
            }
            countQuery += `EXTRACT(MONTH FROM date_of_sale) = $${countParams.length + 1}`;
            countParams.push(month);
        }

        const countResult = await pool.query(countQuery, countParams);

        const totalPages = Math.ceil(countResult.rows[0].total / perPage);

        res.send({
            data: result.rows,
            pagination: {
                currentPage: page,
                totalPages: totalPages,
                perPage: perPage,
                total: countResult.rows[0].total
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error retrieving transactions');
    }
});
  //Task 3
  // GET /statistics
app.get('/statistics', async (req, res) => {
    try {
      const { month, year } = req.query;
      if (!month || !year) {
        res.status(400).send('Month and year are required');
        return;
      }
  
      const query = `
        SELECT 
          SUM(price) AS total_sale_amount,
          COUNT(CASE WHEN date_of_sale IS NOT NULL THEN 1 ELSE NULL END) AS total_sold_items,
          COUNT(CASE WHEN date_of_sale IS NULL THEN 1 ELSE NULL END) AS total_not_sold_items
        FROM products
        WHERE EXTRACT(MONTH FROM date_of_sale) = $1 AND EXTRACT(YEAR FROM date_of_sale) = $2
      `;
      const params = [month, year];
  
      const result = await pool.query(query, params);
      const { total_sale_amount, total_sold_items, total_not_sold_items } = result.rows[0];
  
      res.send({
        totalSaleAmount: total_sale_amount,
        totalSoldItems: total_sold_items,
        totalNotSoldItems: total_not_sold_items,
      });
    } catch (error) {
      console.error(error);
      res.status(500).send('Error retrieving statistics');
    }
  });

  //Task 4
  // GET /bar-chart
app.get('/bar-chart', async (req, res) => {
    try {
      const { month } = req.query;
      if (!month) {
        res.status(400).send('Month is required');
        return;
      }
  
      const query = `
        SELECT 
          CASE 
            WHEN price <= 100 THEN '0-100'
            WHEN price <= 200 THEN '101-200'
            WHEN price <= 300 THEN '201-300'
            WHEN price <= 400 THEN '301-400'
            WHEN price <= 500 THEN '401-500'
            WHEN price <= 600 THEN '501-600'
            WHEN price <= 700 THEN '601-700'
            WHEN price <= 800 THEN '701-800'
            WHEN price <= 900 THEN '801-900'
            ELSE '901-above'
          END AS price_range,
          COUNT(*) AS num_items
        FROM products
        WHERE EXTRACT(MONTH FROM date_of_sale) = $1
        GROUP BY price_range
        ORDER BY price_range
      `;
      const params = [month];
  
      const result = await pool.query(query, params);
  
      const barChartData = result.rows.reduce((acc, row) => {
        acc[row.price_range] = row.num_items;
        return acc;
      }, {
        '0-100': 0,
        '101-200': 0,
        '201-300': 0,
        '301-400': 0,
        '401-500': 0,
        '501-600': 0,
        '601-700': 0,
        '701-800': 0,
        '801-900': 0,
        '901-above': 0,
      });
  
      res.send(barChartData);
    } catch (error) {
      console.error(error);
      res.status(500).send('Error retrieving bar chart data');
    }
  });

  //Task 5
  // GET /pie-chart
app.get('/pie-chart', async (req, res) => {
    try {
      const { month } = req.query;
      if (!month) {
        res.status(400).send('Month is required');
        return;
      }
  
      const query = `
        SELECT 
          category,
          COUNT(*) AS num_items
        FROM products
        WHERE EXTRACT(MONTH FROM date_of_sale) = $1
        GROUP BY category
        ORDER BY num_items DESC
      `;
      const params = [month];
  
      const result = await pool.query(query, params);
  
      const pieChartData = result.rows.reduce((acc, row) => {
        acc[row.category] = row.num_items;
        return acc;
      }, {});
  
      res.send(pieChartData);
    } catch (error) {
      console.error(error);
      res.status(500).send('Error retrieving pie chart data');
    }
  });

  //Task 6
  // GET /combined-data
app.get('/combined-data', async (req, res) => {
    try {
      const { month, year } = req.query;
      if (!month || !year) {
        res.status(400).send('Month and year are required');
        return;
      }
  
      const statisticsQuery = `
        SELECT 
          SUM(price) AS total_sale_amount,
          COUNT(CASE WHEN date_of_sale IS NOT NULL THEN 1 ELSE NULL END) AS total_sold_items,
          COUNT(CASE WHEN date_of_sale IS NULL THEN 1 ELSE NULL END) AS total_not_sold_items
        FROM products
        WHERE EXTRACT(MONTH FROM date_of_sale) = $1 AND EXTRACT(YEAR FROM date_of_sale) = $2
      `;
      const statisticsParams = [month, year];
  
      const barChartQuery = `
        SELECT 
          CASE 
            WHEN price <= 100 THEN '0-100'
            WHEN price <= 200 THEN '101-200'
            WHEN price <= 300 THEN '201-300'
            WHEN price <= 400 THEN '301-400'
            WHEN price <= 500 THEN '401-500'
            WHEN price <= 600 THEN '501-600'
            WHEN price <= 700 THEN '601-700'
            WHEN price <= 800 THEN '701-800'
            WHEN price <= 900 THEN '801-900'
            ELSE '901-above'
          END AS price_range,
          COUNT(*) AS num_items
        FROM products
        WHERE EXTRACT(MONTH FROM date_of_sale) = $1
        GROUP BY price_range
        ORDER BY price_range
      `;
      const barChartParams = [month];
  
      const pieChartQuery = `
        SELECT 
          category,
          COUNT(*) AS num_items
        FROM products
        WHERE EXTRACT(MONTH FROM date_of_sale) = $1
        GROUP BY category
        ORDER BY num_items DESC
      `;
      const pieChartParams = [month];
  
      const [statisticsResult, barChartResult, pieChartResult] = await Promise.all([
        pool.query(statisticsQuery, statisticsParams),
        pool.query(barChartQuery, barChartParams),
        pool.query(pieChartQuery, pieChartParams),
      ]);
  
      const statisticsData = statisticsResult.rows[0];
      const barChartData = barChartResult.rows.reduce((acc, row) => {
        acc[row.price_range] = row.num_items;
        return acc;
      }, {
        '0-100': 0,
        '101-200': 0,
        '201-300': 0,
        '301-400': 0,
        '401-500': 0,
        '501-600': 0,
        '601-700': 0,
        '701-800': 0,
        '801-900': 0,
        '901-above': 0,
      });
      const pieChartData = pieChartResult.rows.reduce((acc, row) => {
        acc[row.category] = row.num_items;
        return acc;
      }, {});
  
      res.send({
        statistics: {
          totalSaleAmount: statisticsData.total_sale_amount,
          totalSoldItems: statisticsData.total_sold_items,
          totalNotSoldItems: statisticsData.total_not_sold_items,
        },
        barChart: barChartData,
        pieChart: pieChartData,
      });
    } catch (error) {
      console.error(error);
      res.status(500).send('Error retrieving combined data');
    }
  });

  const port = 3000;
  app.listen(port, () => {
    console.log(`Server started on port ${port}`);
  });
}).catch((error) => {
  console.error(error);
});