/*
 * Copyright (C) 2016  Ben Ockmore
 *               2016  Sean Burke
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along
 * with this program; if not, write to the Free Software Foundation, Inc.,
 * 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
 */

import * as auth from '../helpers/auth';
import * as error from '../helpers/error';
import * as handler from '../helpers/handler';
import * as search from '../helpers/search';
import Promise from 'bluebird';
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import SearchPage from '../../client/components/pages/search';
import express from 'express';

const router = express.Router();

/**
 * Generates React markup for the search page that is rendered by the user's
 * browser.
 */
router.get('/', (req, res, next) => {
	const {orm} = req.app.locals;
	const query = req.query.q;
	const collection = req.query.collection || null;

	search.searchByName(orm, query, collection)
		.then((entities) => ({
			initialResults: entities,
			query
		}))
		.then((props) => {
			res.render('common', {
				hideSearch: true,
				markup: ReactDOMServer.renderToString(<SearchPage {...props}/>),
				props,
				script: 'search',
				task: 'search',
				title: 'Search Results'
			});
		})
		.catch(next);
});

/**
 * Responds with autocomplete results for a given user query. Can be further
 * filtered by collection type.
 */
router.get('/autocomplete', (req, res) => {
	const {orm} = req.app.locals;
	const query = req.query.q;
	const collection = req.query.collection || null;

	const searchPromise = search.autocomplete(orm, query, collection);

	handler.sendPromiseResult(res, searchPromise);
});

/**
 * Regenerates search index. Restricted to administrators.
 *
 * @throws {error.PermissionDeniedError} - Thrown if user is not admin.
 */
router.get('/reindex', auth.isAuthenticated, (req, res) => {
	const indexPromise = new Promise((resolve) => {
		// TODO: This is hacky, and we should replace it once we switch to SOLR.
		const trustedUsers = ['Leftmost Cat', 'LordSputnik'];

		const NO_MATCH = -1;
		if (trustedUsers.indexOf(req.user.name) === NO_MATCH) {
			throw new error.PermissionDeniedError(null, req);
		}

		resolve();
	})
		.then(() => search.generateIndex())
		.then(() => ({success: true}));

	handler.sendPromiseResult(res, indexPromise);
});

export default router;
