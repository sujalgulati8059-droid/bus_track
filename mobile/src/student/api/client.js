import axios from 'axios';
import { API_BASE_URL } from '../../config';

// Students never log in - every endpoint the student app uses is public.
const client = axios.create({ baseURL: API_BASE_URL, timeout: 20000 });

export default client;
