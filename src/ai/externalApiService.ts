import * as vscode from 'vscode';
import { ConfigurationService } from '../services/configurationService';

export interface WeatherData {
    location: string;
    temperature: number;
    description: string;
    humidity: number;
    windSpeed: number;
    windDirection: string;
    precipitation: string;
    skyCondition: string;
    forecast: string;
    temperatureText: string;
    precipitationProbability: string;
    windSpeedText: string;
    waveHeight: string;
}

export interface NewsData {
    title: string;
    description: string;
    url: string;
    publishedAt: string;
    source: string;
}

export interface StockData {
    symbol: string;
    price: number;
    change: number;
    changePercent: number;
    volume: number;
}

// 기상청 API 응답 타입 정의
interface KmaWeatherApiResponse {
    response: {
        header: {
            resultCode: string;
            resultMsg: string;
        };
        body: {
            items: {
                item: Array<{
                    REG_ID: string;
                    REG_NAME: string;
                    TM_FC: string;
                    TM_EF: string;
                    TA: string;
                    WF: string;
                    SKY: string;
                    PREP: string;
                    W1: string;
                    W2: string;
                    ST: string;
                }>;
            };
        };
    };
}

// 네이버 뉴스 API 응답 타입 정의
interface NaverNewsApiResponse {
    lastBuildDate: string;
    total: number;
    start: number;
    display: number;
    items: Array<{
        title: string;
        originallink: string;
        link: string;
        description: string;
        pubDate: string;
    }>;
}

interface StockApiResponse {
    'Global Quote': {
        '01. symbol': string;
        '05. price': string;
        '06. volume': string;
        '09. change': string;
        '10. change percent': string;
    };
}

export class ExternalApiService {
    private configurationService: ConfigurationService;

    constructor(configurationService: ConfigurationService) {
        this.configurationService = configurationService;
    }

    /**
     * 날씨 정보를 가져옵니다 (기상청 육상예보 API 사용)
     */
    async getWeatherData(city: string): Promise<WeatherData | null> {
        try {
            const apiKey = await this.configurationService.getWeatherApiKey();
            if (!apiKey) {
                console.warn('Weather API key not configured');
                return null;
            }

            // 도시명을 기상청 육상예보 지역코드로 매핑
            const cityCodeMap: { [key: string]: string } = {
                '서울': '11B10101',
                '부산': '11H20201',
                '대구': '11H10701',
                '인천': '11B20201',
                '광주': '11F20501',
                '대전': '11C20401',
                '울산': '11H20101',
                '세종': '11C20404',
                '수원': '11B20601',
                '고양': '11B20301',
                '용인': '11B20602',
                '창원': '11H20301',
                '포항': '11H20201',
                '춘천': '11D10101',
                '강릉': '11D10201',
                '청주': '11C10301',
                '전주': '11F10201',
                '순천': '11F20401',
                '목포': '11F20301',
                '여수': '11F20401',
                '제주': '11G00201',
                '백령도': '11A00101'
            };

            const regId = cityCodeMap[city] || '11B10101'; // 기본값은 서울

            // 육상예보 API 사용 (기온 정보 포함)
            const response = await fetch(
                `https://apihub.kma.go.kr/api/typ02/openApi/VilageFcstMsgService/getLandFcst?pageNo=1&numOfRows=10&dataType=XML&regId=${regId}&authKey=${apiKey}`
            );
            
            if (!response.ok) {
                throw new Error(`Weather API error: ${response.status}`);
            }

            // XML 응답 파싱
            const xmlText = await response.text();
            console.log('Weather API response preview:', xmlText.substring(0, 300));

            const weatherData = this.parseWeatherXmlResponse(xmlText);
            if (!weatherData) {
                throw new Error('No weather data found in XML response');
            }

            console.log('Parsed weather data:', weatherData);

            // 날씨코드를 텍스트로 변환
            const weatherCodeMap: { [key: string]: string } = {
                'DB01': '맑음',
                'DB02': '구름조금',
                'DB03': '구름많음',
                'DB04': '흐림'
            };

            // 강수형태 코드를 텍스트로 변환
            const precipitationMap: { [key: string]: string } = {
                '0': '없음',
                '1': '비',
                '2': '비/눈',
                '3': '눈',
                '4': '눈/비'
            };

            // 풍향을 16방위로 변환
            const windDirectionMap: { [key: string]: string } = {
                'N': '북', 'NNE': '북북동', 'NE': '북동', 'ENE': '동북동',
                'E': '동', 'ESE': '동남동', 'SE': '남동', 'SSE': '남남동',
                'S': '남', 'SSW': '남남서', 'SW': '남서', 'WSW': '서남서',
                'W': '서', 'WNW': '서북서', 'NW': '북서', 'NNW': '북북서'
            };

            const windDirection = windDirectionMap[weatherData.wd1] || weatherData.wd1 || '알 수 없음';
            const skyCondition = weatherCodeMap[weatherData.wfCd] || '알 수 없음';
            const precipitation = precipitationMap[weatherData.rnYn] || '없음';

            // 기온 처리
            let temperature = 0;
            let temperatureText = '정보 없음';
            if (weatherData.ta && weatherData.ta !== '-99' && weatherData.ta.trim() !== '') {
                const tempValue = parseFloat(weatherData.ta);
                if (!isNaN(tempValue)) {
                    temperature = tempValue;
                    temperatureText = `${tempValue}°C`;
                }
            }

            // 강수확률 처리
            let precipitationProbability = '';
            if (weatherData.rnSt && weatherData.rnSt !== '-99' && weatherData.rnSt.trim() !== '') {
                const probValue = parseFloat(weatherData.rnSt);
                if (!isNaN(probValue)) {
                    precipitationProbability = `${probValue}%`;
                }
            }

            // 풍속 처리 (육상예보 API에서는 풍속 정보가 제한적)
            let windSpeed = 0;
            let windSpeedText = '';
            if (weatherData.wsIt && weatherData.wsIt !== '-99' && weatherData.wsIt.trim() !== '') {
                // 풍속 강도코드를 텍스트로 변환
                const windSpeedMap: { [key: string]: string } = {
                    '0': '약함',
                    '1': '약함',
                    '2': '보통',
                    '3': '강함',
                    '4': '매우강함'
                };
                windSpeedText = windSpeedMap[weatherData.wsIt] || '알 수 없음';
            }

            return {
                location: city,
                temperature: temperature,
                description: weatherData.wf || '날씨 정보 없음',
                humidity: 0, // 기상청 API에는 습도 정보가 없음
                windSpeed: windSpeed,
                windDirection: windDirection,
                precipitation: precipitation,
                skyCondition: skyCondition,
                forecast: weatherData.wf || '예보 정보 없음',
                temperatureText: temperatureText,
                precipitationProbability: precipitationProbability,
                windSpeedText: windSpeedText,
                waveHeight: '' // 육상예보에는 파고 정보가 없음
            };
        } catch (error) {
            console.error('Error fetching weather data:', error);
            return null;
        }
    }

    /**
     * 기상청 육상예보 API의 XML 응답을 파싱합니다
     */
    private parseWeatherXmlResponse(xmlText: string): {
        wd1: string;
        wd2: string;
        ta: string;
        rnSt: string;
        wf: string;
        wfCd: string;
        rnYn: string;
        wsIt: string;
    } | null {
        try {
            // 간단한 XML 파싱 (정규식 사용)
            const wd1Match = xmlText.match(/<wd1>([^<]+)<\/wd1>/);
            const wd2Match = xmlText.match(/<wd2>([^<]+)<\/wd2>/);
            const taMatch = xmlText.match(/<ta>([^<]+)<\/ta>/);
            const rnStMatch = xmlText.match(/<rnSt>([^<]+)<\/rnSt>/);
            const wfMatch = xmlText.match(/<wf>([^<]+)<\/wf>/);
            const wfCdMatch = xmlText.match(/<wfCd>([^<]+)<\/wfCd>/);
            const rnYnMatch = xmlText.match(/<rnYn>([^<]+)<\/rnYn>/);
            const wsItMatch = xmlText.match(/<wsIt>([^<]+)<\/wsIt>/);

            if (!taMatch && !wfMatch) {
                console.error('No weather data found in XML response');
                return null;
            }

            return {
                wd1: wd1Match ? wd1Match[1].trim() : '',
                wd2: wd2Match ? wd2Match[1].trim() : '',
                ta: taMatch ? taMatch[1].trim() : '',
                rnSt: rnStMatch ? rnStMatch[1].trim() : '',
                wf: wfMatch ? wfMatch[1].trim() : '',
                wfCd: wfCdMatch ? wfCdMatch[1].trim() : '',
                rnYn: rnYnMatch ? rnYnMatch[1].trim() : '',
                wsIt: wsItMatch ? wsItMatch[1].trim() : ''
            };
        } catch (error) {
            console.error('Error parsing weather XML response:', error);
            return null;
        }
    }

    /**
     * 뉴스 정보를 가져옵니다 (네이버 뉴스 검색 API 사용)
     */
    async getNewsData(query: string = 'IT', count: number = 10): Promise<NewsData[]> {
        try {
            const clientId = await this.configurationService.getNewsApiKey();
            const clientSecret = await this.configurationService.getNewsApiSecret();
            
            if (!clientId || !clientSecret) {
                console.warn('Naver News API credentials not configured');
                return [];
            }

            // 네이버 API는 한 번에 최대 100개까지 요청 가능하지만, 
            // 실제로는 10-20개 정도가 적절한 응답 시간을 보장
            const displayCount = Math.min(count, 20);
            
            const response = await fetch(
                `https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(query)}&display=${displayCount}&sort=date`,
                {
                    headers: {
                        'X-Naver-Client-Id': clientId,
                        'X-Naver-Client-Secret': clientSecret
                    }
                }
            );
            
            if (!response.ok) {
                throw new Error(`Naver News API error: ${response.status}`);
            }

            const data = await response.json() as NaverNewsApiResponse;
            
            return data.items.map((item) => ({
                title: this.decodeHtmlEntities(item.title),
                description: this.decodeHtmlEntities(item.description),
                url: item.link,
                publishedAt: new Date(item.pubDate).toLocaleString('ko-KR'),
                source: this.extractSourceFromUrl(item.originallink)
            }));
        } catch (error) {
            console.error('Error fetching news data:', error);
            return [];
        }
    }

    /**
     * HTML 엔티티를 디코딩합니다 (네이버 API 응답에서 HTML 태그 제거)
     */
    private decodeHtmlEntities(text: string): string {
        return text
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/<[^>]*>/g, '') // HTML 태그 제거
            .trim();
    }

    /**
     * URL에서 뉴스 소스를 추출합니다
     */
    private extractSourceFromUrl(url: string): string {
        try {
            const urlObj = new URL(url);
            const hostname = urlObj.hostname;
            
            // 주요 뉴스 사이트 매핑
            const sourceMap: { [key: string]: string } = {
                'news.naver.com': '네이버뉴스',
                'www.chosun.com': '조선일보',
                'www.donga.com': '동아일보',
                'www.hani.co.kr': '한겨레',
                'www.khan.co.kr': '경향신문',
                'www.kyunghyang.com': '경향신문',
                'www.mk.co.kr': '매일경제',
                'www.hankyung.com': '한국경제',
                'www.etnews.com': '전자신문',
                'www.zdnet.co.kr': 'ZDNet Korea',
                'www.itworld.co.kr': 'ITWorld',
                'www.ciokorea.com': 'CIO Korea'
            };
            
            return sourceMap[hostname] || hostname.replace('www.', '');
        } catch {
            return '알 수 없음';
        }
    }

    /**
     * 주식 정보를 가져옵니다 (Alpha Vantage API 사용)
     */
    async getStockData(symbol: string): Promise<StockData | null> {
        try {
            const apiKey = await this.configurationService.getStockApiKey();
            if (!apiKey) {
                console.warn('Stock API key not configured');
                return null;
            }

            const response = await fetch(
                `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`
            );
            
            if (!response.ok) {
                throw new Error(`Stock API error: ${response.status}`);
            }

            const data = await response.json() as StockApiResponse;
            const quote = data['Global Quote'];
            
            if (!quote) {
                throw new Error('No stock data found');
            }

            return {
                symbol: quote['01. symbol'],
                price: parseFloat(quote['05. price']),
                change: parseFloat(quote['09. change']),
                changePercent: parseFloat(quote['10. change percent'].replace('%', '')),
                volume: parseInt(quote['06. volume'])
            };
        } catch (error) {
            console.error('Error fetching stock data:', error);
            return null;
        }
    }

    /**
     * 여러 주식 정보를 한 번에 가져옵니다
     */
    async getMultipleStockData(symbols: string[]): Promise<StockData[]> {
        const stockData: StockData[] = [];
        
        for (const symbol of symbols) {
            const data = await this.getStockData(symbol);
            if (data) {
                stockData.push(data);
            }
            // API 호출 제한을 위해 잠시 대기
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        return stockData;
    }

    /**
     * 실시간 정보 요약을 생성합니다
     */
    async getRealTimeSummary(weatherCity?: string, newsQuery?: string, stockSymbols?: string[]): Promise<string> {
        let summary = '## 실시간 정보 요약\n\n';
        
        // 날씨 정보
        if (weatherCity) {
            const weather = await this.getWeatherData(weatherCity);
            if (weather) {
                summary += `### 🌤️ ${weather.location} 날씨\n`;
                summary += `- 온도: ${weather.temperatureText}\n`;
                summary += `- 날씨: ${weather.forecast}\n`;
                summary += `- 하늘상태: ${weather.skyCondition}\n`;
                summary += `- 강수: ${weather.precipitation}\n`;
                summary += `- 풍향: ${weather.windDirection}\n\n`;
            }
        }
        
        // 뉴스 정보
        if (newsQuery) {
            const news = await this.getNewsData(newsQuery, 3);
            if (news.length > 0) {
                summary += `### 📰 ${newsQuery} 관련 뉴스\n`;
                news.forEach((item, index) => {
                    summary += `${index + 1}. **${item.title}**\n`;
                    summary += `   - ${item.description}\n`;
                    summary += `   - 출처: ${item.source} (${item.publishedAt})\n\n`;
                });
            }
        }
        
        // 주식 정보
        if (stockSymbols && stockSymbols.length > 0) {
            const stocks = await this.getMultipleStockData(stockSymbols);
            if (stocks.length > 0) {
                summary += `### 📈 주식 정보\n`;
                stocks.forEach(stock => {
                    const changeIcon = stock.change >= 0 ? '📈' : '📉';
                    summary += `- **${stock.symbol}**: $${stock.price.toFixed(2)} `;
                    summary += `${changeIcon} ${stock.change >= 0 ? '+' : ''}${stock.change.toFixed(2)} `;
                    summary += `(${stock.changePercent >= 0 ? '+' : ''}${stock.changePercent.toFixed(2)}%)\n`;
                });
                summary += '\n';
            }
        }
        
        return summary;
    }
} 